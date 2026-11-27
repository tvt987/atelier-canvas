using System.Globalization;
using AtelierCanvas.Domain.Models;

namespace AtelierCanvas.Domain.Services;

/// <summary>
/// Evaluates WCAG 2.1 relative luminance and contrast ratios across a full
/// Component Variant Matrix (Primitives x Variants x Sizes x States) and computes
/// mathematically verified foreground/background hex adjustments.
/// </summary>
public static class ComponentVariantAuditor
{
    public static readonly string[] AllPrimitives = ["action-button", "status-badge", "metric-input"];
    public static readonly string[] AllVariants = ["primary", "secondary", "ghost", "destructive"];
    public static readonly string[] AllSizes = ["sm", "md", "lg"];
    public static readonly string[] AllStates = ["default", "hover", "focus", "disabled"];

    public static VariantMatrixAuditResponse AuditMatrix(
        NormalizedDesignTokens tokens,
        string? targetLevel = null,
        IReadOnlyList<string>? requestedPrimitives = null,
        IReadOnlyList<VariantCellInput>? customCells = null)
    {
        var (normalizedLevel, targetRatio) = ParseTargetLevel(targetLevel);
        var cells = new List<VariantCellAuditResult>();

        if (customCells is { Count: > 0 })
        {
            foreach (var input in customCells)
            {
                if (!WcagContrastAuditor.TryParseHexRgb(input.ForegroundHex, out _))
                {
                    throw new ArgumentException(
                        $"Invalid foreground hex color '{input.ForegroundHex}' on cell '{input.Id}'.",
                        nameof(customCells));
                }

                if (!WcagContrastAuditor.TryParseHexRgb(input.BackgroundHex, out _))
                {
                    throw new ArgumentException(
                        $"Invalid background hex color '{input.BackgroundHex}' on cell '{input.Id}'.",
                        nameof(customCells));
                }

                var borderHex = string.IsNullOrWhiteSpace(input.BorderHex)
                    ? WcagContrastAuditor.NormalizeHex6(input.BackgroundHex)
                    : WcagContrastAuditor.TryParseHexRgb(input.BorderHex, out _)
                        ? WcagContrastAuditor.NormalizeHex6(input.BorderHex)
                        : throw new ArgumentException(
                            $"Invalid border hex color '{input.BorderHex}' on cell '{input.Id}'.",
                            nameof(customCells));

                var preferBg = input.Variant.Equals("primary", StringComparison.OrdinalIgnoreCase)
                    || input.Variant.Equals("destructive", StringComparison.OrdinalIgnoreCase);

                cells.Add(EvaluateCell(
                    id: string.IsNullOrWhiteSpace(input.Id)
                        ? $"{input.Primitive}:{input.Variant}:{input.Size}:{input.State}"
                        : input.Id,
                    primitive: input.Primitive,
                    variant: input.Variant,
                    size: input.Size,
                    state: input.State,
                    fgHex: WcagContrastAuditor.NormalizeHex6(input.ForegroundHex),
                    bgHex: WcagContrastAuditor.NormalizeHex6(input.BackgroundHex),
                    borderHex: borderHex,
                    targetRatio: targetRatio,
                    preferBgAdjustment: preferBg
                ));
            }
        }
        else
        {
            var primitives = ResolvePrimitives(requestedPrimitives);
            foreach (var primitive in primitives)
            {
                foreach (var variant in AllVariants)
                {
                    foreach (var size in AllSizes)
                    {
                        foreach (var state in AllStates)
                        {
                            var (fg, bg, border, preferBg) = ResolveCellColors(tokens, primitive, variant, state);
                            var id = $"{primitive}:{variant}:{size}:{state}";
                            cells.Add(EvaluateCell(
                                id: id,
                                primitive: primitive,
                                variant: variant,
                                size: size,
                                state: state,
                                fgHex: fg,
                                bgHex: bg,
                                borderHex: border,
                                targetRatio: targetRatio,
                                preferBgAdjustment: preferBg
                            ));
                        }
                    }
                }
            }
        }

        var totalCells = cells.Count;
        var passingCells = cells.Count(c => c.PassesTarget);
        var failingCells = totalCells - passingCells;
        var aaPassCount = cells.Count(c => c.PassesAA);
        var aaaPassCount = cells.Count(c => c.PassesAAA);
        var scorePercent = totalCells > 0
            ? Math.Round(passingCells * 100.0 / totalCells, 1, MidpointRounding.AwayFromZero)
            : 100.0;

        var recommendedOverrides = ComputeRecommendedTokenOverrides(tokens, targetRatio);

        return new VariantMatrixAuditResponse(
            ThemeId: tokens.Id,
            ThemeName: tokens.Name,
            TargetLevel: normalizedLevel,
            TargetRatio: targetRatio,
            TotalCells: totalCells,
            PassingCells: passingCells,
            FailingCells: failingCells,
            AaPassCount: aaPassCount,
            AaaPassCount: aaaPassCount,
            ComplianceScorePercent: scorePercent,
            RecommendedTokenOverrides: recommendedOverrides,
            Cells: cells,
            AuditedAtUtc: DateTimeOffset.UtcNow
        );
    }

    public static AccessibleColorRecommendation ComputeAccessibleFix(
        string fgHex,
        string bgHex,
        double targetRatio = 4.5,
        bool preferBackgroundAdjustment = false)
    {
        var normFg = WcagContrastAuditor.NormalizeHex6(fgHex);
        var normBg = WcagContrastAuditor.NormalizeHex6(bgHex);
        var originalRatio = WcagContrastAuditor.ComputeContrastRatio(normFg, normBg);
        var safeTarget = targetRatio + 0.05;

        if (originalRatio >= targetRatio)
        {
            return new AccessibleColorRecommendation(
                RecommendedForegroundHex: normFg,
                RecommendedBackgroundHex: normBg,
                OriginalRatio: originalRatio,
                FixedRatio: originalRatio,
                FixedGrade: ClassifyGrade(originalRatio),
                Strategy: "already-compliant"
            );
        }

        var fgLum = WcagContrastAuditor.RelativeLuminance(normFg);
        var bgLum = WcagContrastAuditor.RelativeLuminance(normBg);

        if (preferBackgroundAdjustment)
        {
            var ink = fgLum >= 0.45 ? "#FFFFFF" : "#090B10";
            var bgPole = ink == "#FFFFFF" ? "#05070B" : "#FFFFFF";
            var bgSearch = BinarySearchBlend(normBg, bgPole, ink, sourceIsForeground: false, safeTarget);
            if (bgSearch is not null && bgSearch.Value.Factor <= 0.68)
            {
                var fixedRatio = WcagContrastAuditor.ComputeContrastRatio(ink, bgSearch.Value.Hex);
                return new AccessibleColorRecommendation(
                    RecommendedForegroundHex: ink,
                    RecommendedBackgroundHex: bgSearch.Value.Hex,
                    OriginalRatio: originalRatio,
                    FixedRatio: fixedRatio,
                    FixedGrade: ClassifyGrade(fixedRatio),
                    Strategy: bgPole == "#05070B" ? "darken-background" : "lighten-background"
                );
            }

            var altInk = ink == "#FFFFFF" ? "#090B10" : "#FFFFFF";
            var altRatio = WcagContrastAuditor.ComputeContrastRatio(altInk, normBg);
            if (altRatio >= targetRatio)
            {
                return new AccessibleColorRecommendation(
                    RecommendedForegroundHex: altInk,
                    RecommendedBackgroundHex: normBg,
                    OriginalRatio: originalRatio,
                    FixedRatio: altRatio,
                    FixedGrade: ClassifyGrade(altRatio),
                    Strategy: "flip-foreground-ink"
                );
            }
        }

        var toLightFg = BinarySearchBlend(normFg, "#FFFFFF", normBg, sourceIsForeground: true, safeTarget);
        var toDarkFg = BinarySearchBlend(normFg, "#090B10", normBg, sourceIsForeground: true, safeTarget);

        var chosenFg = PickSmallestShift(toLightFg, toDarkFg);
        if (chosenFg is not null)
        {
            var fixedRatio = WcagContrastAuditor.ComputeContrastRatio(chosenFg.Value.Hex, normBg);
            return new AccessibleColorRecommendation(
                RecommendedForegroundHex: chosenFg.Value.Hex,
                RecommendedBackgroundHex: normBg,
                OriginalRatio: originalRatio,
                FixedRatio: fixedRatio,
                FixedGrade: ClassifyGrade(fixedRatio),
                Strategy: chosenFg.Value.Factor >= 0.92 ? "flip-foreground-ink" : "adjust-foreground"
            );
        }

        var useLightInk = bgLum < 0.35;
        var fallbackInk = useLightInk ? "#FFFFFF" : "#090B10";
        var fallbackPole = useLightInk ? "#05070B" : "#FFFFFF";
        var bgFallback = BinarySearchBlend(normBg, fallbackPole, fallbackInk, sourceIsForeground: false, safeTarget);
        if (bgFallback is not null)
        {
            var fixedRatio = WcagContrastAuditor.ComputeContrastRatio(fallbackInk, bgFallback.Value.Hex);
            return new AccessibleColorRecommendation(
                RecommendedForegroundHex: fallbackInk,
                RecommendedBackgroundHex: bgFallback.Value.Hex,
                OriginalRatio: originalRatio,
                FixedRatio: fixedRatio,
                FixedGrade: ClassifyGrade(fixedRatio),
                Strategy: useLightInk ? "darken-background" : "lighten-background"
            );
        }

        var hardFg = bgLum < 0.5 ? "#FFFFFF" : "#090B10";
        var hardBg = bgLum < 0.5 ? "#090B10" : "#FFFFFF";
        var hardRatio = WcagContrastAuditor.ComputeContrastRatio(hardFg, hardBg);
        return new AccessibleColorRecommendation(
            RecommendedForegroundHex: hardFg,
            RecommendedBackgroundHex: hardBg,
            OriginalRatio: originalRatio,
            FixedRatio: hardRatio,
            FixedGrade: ClassifyGrade(hardRatio),
            Strategy: "high-contrast-pair"
        );
    }

    private static VariantCellAuditResult EvaluateCell(
        string id,
        string primitive,
        string variant,
        string size,
        string state,
        string fgHex,
        string bgHex,
        string borderHex,
        double targetRatio,
        bool preferBgAdjustment)
    {
        var fgLum = Math.Round(WcagContrastAuditor.RelativeLuminance(fgHex), 4, MidpointRounding.AwayFromZero);
        var bgLum = Math.Round(WcagContrastAuditor.RelativeLuminance(bgHex), 4, MidpointRounding.AwayFromZero);
        var ratio = WcagContrastAuditor.ComputeContrastRatio(fgHex, bgHex);
        var grade = ClassifyGrade(ratio);
        var passesAA = ratio >= 4.5;
        var passesAAA = ratio >= 7.0;
        var passesTarget = ratio >= targetRatio;

        var recommendation = passesTarget
            ? null
            : ComputeAccessibleFix(fgHex, bgHex, targetRatio, preferBgAdjustment);

        return new VariantCellAuditResult(
            Id: id,
            Primitive: primitive,
            Variant: variant,
            Size: size,
            State: state,
            ForegroundHex: fgHex,
            BackgroundHex: bgHex,
            BorderHex: borderHex,
            ForegroundLuminance: fgLum,
            BackgroundLuminance: bgLum,
            ContrastRatio: ratio,
            RatioLabel: $"{ratio.ToString("0.00", CultureInfo.InvariantCulture)}:1",
            Grade: grade,
            PassesAA: passesAA,
            PassesAAA: passesAAA,
            PassesTarget: passesTarget,
            Recommendation: recommendation
        );
    }

    private static Dictionary<string, string> ComputeRecommendedTokenOverrides(
        NormalizedDesignTokens tokens,
        double targetRatio)
    {
        var overrides = new Dictionary<string, string>(StringComparer.Ordinal);

        var primaryFix = ComputeAccessibleFix("#FFFFFF", tokens.BrandPrimary, targetRatio, preferBackgroundAdjustment: true);
        if (!string.Equals(primaryFix.RecommendedBackgroundHex, tokens.BrandPrimary, StringComparison.OrdinalIgnoreCase))
        {
            overrides["brandPrimary"] = primaryFix.RecommendedBackgroundHex;
        }

        var dangerFix = ComputeAccessibleFix("#FFFFFF", tokens.Danger500, targetRatio, preferBackgroundAdjustment: true);
        if (!string.Equals(dangerFix.RecommendedBackgroundHex, tokens.Danger500, StringComparison.OrdinalIgnoreCase))
        {
            overrides["danger500"] = dangerFix.RecommendedBackgroundHex;
        }

        var accentFix = ComputeAccessibleFix(tokens.BrandAccent, tokens.SurfaceCard, targetRatio, preferBackgroundAdjustment: false);
        if (!string.Equals(accentFix.RecommendedForegroundHex, tokens.BrandAccent, StringComparison.OrdinalIgnoreCase))
        {
            overrides["brandAccent"] = accentFix.RecommendedForegroundHex;
        }

        var mutedFix = ComputeAccessibleFix(tokens.TextMuted, tokens.SurfaceCard, targetRatio, preferBackgroundAdjustment: false);
        if (!string.Equals(mutedFix.RecommendedForegroundHex, tokens.TextMuted, StringComparison.OrdinalIgnoreCase))
        {
            overrides["textMuted"] = mutedFix.RecommendedForegroundHex;
        }

        return overrides;
    }

    private static (string Foreground, string Background, string Border, bool PreferBgFix) ResolveCellColors(
        NormalizedDesignTokens t,
        string primitive,
        string variant,
        string state)
    {
        var lightSurface = WcagContrastAuditor.RelativeLuminance(t.SurfaceCanvas) > 0.42;
        string bg;
        string fg;
        string bdr;
        var preferBgFix = false;

        if (primitive == "action-button")
        {
            switch (variant)
            {
                case "primary":
                    bg = t.BrandPrimary;
                    fg = "#FFFFFF";
                    bdr = t.BrandPrimary;
                    preferBgFix = true;
                    break;
                case "secondary":
                    bg = t.SurfaceElevated;
                    fg = t.TextPrimary;
                    bdr = t.BorderSubtle;
                    break;
                case "ghost":
                    bg = t.SurfaceCard;
                    fg = t.BrandAccent;
                    bdr = t.SurfaceCard;
                    break;
                default:
                    bg = t.Danger500;
                    fg = "#FFFFFF";
                    bdr = t.Danger500;
                    preferBgFix = true;
                    break;
            }
        }
        else if (primitive == "status-badge")
        {
            switch (variant)
            {
                case "primary":
                    bg = BlendHexOverSurface(t.BrandPrimary, t.SurfaceCard, 0.24);
                    fg = t.BrandPrimary;
                    bdr = BlendHexOverSurface(t.BrandPrimary, t.SurfaceCard, 0.48);
                    break;
                case "secondary":
                    bg = t.SurfaceElevated;
                    fg = t.TextMuted;
                    bdr = t.BorderSubtle;
                    break;
                case "ghost":
                    bg = t.SurfaceCard;
                    fg = t.TextMuted;
                    bdr = t.BorderSubtle;
                    break;
                default:
                    bg = BlendHexOverSurface(t.Danger500, t.SurfaceCard, 0.22);
                    fg = t.Danger500;
                    bdr = BlendHexOverSurface(t.Danger500, t.SurfaceCard, 0.5);
                    break;
            }
        }
        else
        {
            switch (variant)
            {
                case "primary":
                    bg = t.SurfaceCard;
                    fg = t.TextPrimary;
                    bdr = t.BrandPrimary;
                    break;
                case "secondary":
                    bg = t.SurfaceElevated;
                    fg = t.TextPrimary;
                    bdr = t.BorderSubtle;
                    break;
                case "ghost":
                    bg = t.SurfaceCanvas;
                    fg = t.TextMuted;
                    bdr = BlendHexOverSurface(t.BorderSubtle, t.SurfaceCanvas, 0.6);
                    break;
                default:
                    bg = BlendHexOverSurface(t.Danger500, t.SurfaceCard, 0.1);
                    fg = t.Danger500;
                    bdr = t.Danger500;
                    break;
            }
        }

        if (state == "hover")
        {
            if (variant is "primary" or "destructive")
            {
                bg = ShiftHexLuminance(bg, lightSurface ? -0.1 : 0.14);
                bdr = ShiftHexLuminance(bdr, lightSurface ? -0.12 : 0.18);
            }
            else if (variant == "ghost")
            {
                bg = BlendHexOverSurface(t.SurfaceElevated, t.SurfaceCard, 0.72);
                bdr = t.BorderSubtle;
            }
            else
            {
                bg = ShiftHexLuminance(bg, lightSurface ? -0.05 : 0.08);
                bdr = t.BrandAccent;
            }
        }
        else if (state == "focus")
        {
            bdr = variant == "destructive" ? t.Danger500 : t.BrandAccent;
        }
        else if (state == "disabled")
        {
            bg = BlendHexOverSurface(bg, t.SurfaceCanvas, 0.42);
            fg = BlendHexOverSurface(fg, bg, 0.44);
            bdr = BlendHexOverSurface(bdr, t.SurfaceCanvas, 0.35);
            preferBgFix = false;
        }

        return (fg, bg, bdr, preferBgFix);
    }

    private static (string Level, double TargetRatio) ParseTargetLevel(string? targetLevel)
    {
        if (string.IsNullOrWhiteSpace(targetLevel)) return ("AA", 4.5);
        var normalized = targetLevel.Trim().ToUpperInvariant();
        return normalized switch
        {
            "AA" => ("AA", 4.5),
            "AAA" => ("AAA", 7.0),
            _ => throw new ArgumentException(
                $"Unsupported WCAG targetLevel '{targetLevel}'. Supported values: AA, AAA.",
                nameof(targetLevel))
        };
    }

    private static List<string> ResolvePrimitives(IReadOnlyList<string>? requested)
    {
        if (requested is null || requested.Count == 0)
        {
            return [.. AllPrimitives];
        }

        var result = new List<string>();
        foreach (var raw in requested)
        {
            var normalized = (raw ?? string.Empty).Trim().ToLowerInvariant();
            if (!AllPrimitives.Contains(normalized))
            {
                throw new ArgumentException(
                    $"Unsupported component primitive '{raw}'. Supported primitives: {string.Join(", ", AllPrimitives)}.",
                    nameof(requested));
            }
            if (!result.Contains(normalized))
            {
                result.Add(normalized);
            }
        }
        return result;
    }

    private static string ClassifyGrade(double ratio) =>
        ratio >= 7.0 ? "AAA"
        : ratio >= 4.5 ? "AA"
        : ratio >= 3.0 ? "AA-Large"
        : "FAIL";

    public static string BlendHexOverSurface(string fgHex, string bgHex, double alpha)
    {
        var a = Math.Clamp(alpha, 0.0, 1.0);
        WcagContrastAuditor.TryParseHexRgb(fgHex, out var fg);
        WcagContrastAuditor.TryParseHexRgb(bgHex, out var bg);

        var r = Math.Clamp((int)Math.Round(fg.R * a + bg.R * (1.0 - a), MidpointRounding.AwayFromZero), 0, 255);
        var g = Math.Clamp((int)Math.Round(fg.G * a + bg.G * (1.0 - a), MidpointRounding.AwayFromZero), 0, 255);
        var b = Math.Clamp((int)Math.Round(fg.B * a + bg.B * (1.0 - a), MidpointRounding.AwayFromZero), 0, 255);
        return $"#{r:X2}{g:X2}{b:X2}";
    }

    public static string ShiftHexLuminance(string hex, double delta)
    {
        var pole = delta >= 0 ? "#FFFFFF" : "#000000";
        return BlendHexOverSurface(pole, hex, Math.Min(1.0, Math.Abs(delta)));
    }

    private static (string Hex, double Factor, double Ratio)? BinarySearchBlend(
        string sourceHex,
        string poleHex,
        string fixedHex,
        bool sourceIsForeground,
        double minRatio)
    {
        var endRatio = sourceIsForeground
            ? WcagContrastAuditor.ComputeContrastRatio(poleHex, fixedHex)
            : WcagContrastAuditor.ComputeContrastRatio(fixedHex, poleHex);
        if (endRatio < minRatio) return null;

        var lo = 0.0;
        var hi = 1.0;
        var bestHex = poleHex;
        var bestFactor = 1.0;
        var bestRatio = endRatio;

        for (var i = 0; i < 16; i++)
        {
            var mid = (lo + hi) / 2.0;
            var candidate = BlendHexOverSurface(poleHex, sourceHex, mid);
            var ratio = sourceIsForeground
                ? WcagContrastAuditor.ComputeContrastRatio(candidate, fixedHex)
                : WcagContrastAuditor.ComputeContrastRatio(fixedHex, candidate);

            if (ratio >= minRatio)
            {
                bestHex = candidate;
                bestFactor = mid;
                bestRatio = ratio;
                hi = mid;
            }
            else
            {
                lo = mid;
            }
        }

        return (bestHex, bestFactor, bestRatio);
    }

    private static (string Hex, double Factor, double Ratio)? PickSmallestShift(
        (string Hex, double Factor, double Ratio)? a,
        (string Hex, double Factor, double Ratio)? b)
    {
        if (a is null) return b;
        if (b is null) return a;
        return a.Value.Factor <= b.Value.Factor ? a : b;
    }
}
