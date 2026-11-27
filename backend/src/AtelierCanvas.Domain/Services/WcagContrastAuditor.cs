using System.Globalization;
using AtelierCanvas.Domain.Models;

namespace AtelierCanvas.Domain.Services;

public static class WcagContrastAuditor
{
    public static bool TryParseHexRgb(string? hex, out (int R, int G, int B) rgb)
    {
        rgb = default;
        if (string.IsNullOrWhiteSpace(hex)) return false;

        var clean = hex.Trim();
        if (clean.StartsWith('#'))
        {
            clean = clean[1..];
        }

        if (clean.Length == 3)
        {
            clean = string.Create(6, clean, static (span, src) =>
            {
                span[0] = src[0];
                span[1] = src[0];
                span[2] = src[1];
                span[3] = src[1];
                span[4] = src[2];
                span[5] = src[2];
            });
        }

        if (clean.Length != 6) return false;

        if (!int.TryParse(clean.AsSpan(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var r) ||
            !int.TryParse(clean.AsSpan(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var g) ||
            !int.TryParse(clean.AsSpan(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var b))
        {
            return false;
        }

        rgb = (r, g, b);
        return true;
    }

    public static string NormalizeHex6(string hex)
    {
        if (!TryParseHexRgb(hex, out var rgb))
        {
            throw new ArgumentException($"Invalid hex color '{hex}'.", nameof(hex));
        }

        return $"#{rgb.R:X2}{rgb.G:X2}{rgb.B:X2}";
    }

    private static double LinearizeChannel(int channel255)
    {
        var s = channel255 / 255.0;
        return s <= 0.03928 ? s / 12.92 : Math.Pow((s + 0.055) / 1.055, 2.4);
    }

    public static double RelativeLuminance(string hex)
    {
        if (!TryParseHexRgb(hex, out var rgb)) return 0.0;

        return 0.2126 * LinearizeChannel(rgb.R)
             + 0.7152 * LinearizeChannel(rgb.G)
             + 0.0722 * LinearizeChannel(rgb.B);
    }

    public static double ComputeContrastRatio(string foregroundHex, string backgroundHex)
    {
        var l1 = RelativeLuminance(foregroundHex);
        var l2 = RelativeLuminance(backgroundHex);
        var lighter = Math.Max(l1, l2);
        var darker = Math.Min(l1, l2);
        return Math.Round((lighter + 0.05) / (darker + 0.05), 2, MidpointRounding.AwayFromZero);
    }

    public static WcagPairAudit EvaluatePair(string id, string label, string fgHex, string bgHex)
    {
        var normalizedFg = NormalizeHex6(fgHex);
        var normalizedBg = NormalizeHex6(bgHex);
        var rawRatio = ComputeContrastRatio(normalizedFg, normalizedBg);
        var ratio = Math.Round(rawRatio, 1, MidpointRounding.AwayFromZero);

        var grade = ratio >= 7.0 ? "AAA"
            : ratio >= 4.5 ? "AA"
            : ratio >= 3.0 ? "AA-Large"
            : "FAIL";

        return new WcagPairAudit(
            Id: id,
            Label: label,
            ForegroundHex: normalizedFg,
            BackgroundHex: normalizedBg,
            Ratio: ratio,
            RatioLabel: $"{ratio.ToString("0.0", CultureInfo.InvariantCulture)}:1",
            Grade: grade,
            PassesAA: ratio >= 4.5,
            PassesAAA: ratio >= 7.0
        );
    }

    public static WcagAuditReport AuditTokenSet(NormalizedDesignTokens tokens)
    {
        var pairs = new List<WcagPairAudit>
        {
            EvaluatePair("text-on-canvas", "Primary Text / Canvas", tokens.TextPrimary, tokens.SurfaceCanvas),
            EvaluatePair("text-on-card", "Primary Text / Card", tokens.TextPrimary, tokens.SurfaceCard),
            EvaluatePair("muted-on-card", "Muted Text / Card", tokens.TextMuted, tokens.SurfaceCard),
            EvaluatePair("white-on-brand", "White Ink / Brand Primary", "#FFFFFF", tokens.BrandPrimary),
            EvaluatePair("accent-on-canvas", "Brand Accent / Canvas", tokens.BrandAccent, tokens.SurfaceCanvas),
        };

        var aaPass = pairs.Count(p => p.PassesAA);
        var aaaPass = pairs.Count(p => p.PassesAAA);
        var rate = (int)Math.Round(aaPass * 100.0 / pairs.Count, MidpointRounding.AwayFromZero);

        return new WcagAuditReport(
            Pairs: pairs,
            AaPassCount: aaPass,
            AaaPassCount: aaaPass,
            TotalPairs: pairs.Count,
            PassRatePercent: rate
        );
    }
}
