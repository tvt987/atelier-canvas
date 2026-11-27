using System.Globalization;
using System.Text.Json;
using AtelierCanvas.Domain.Models;

namespace AtelierCanvas.Domain.Services;

/// <summary>
/// Validates and normalizes W3C Design Tokens Community Group (DTCG) JSON documents
/// as well as flat semantic token objects emitted by Atelier Canvas Studio.
/// </summary>
public static class W3CTokenValidator
{
    public static TokenValidationResult ValidateAndNormalize(JsonElement root)
    {
        var errors = new List<string>();

        if (root.ValueKind != JsonValueKind.Object)
        {
            return new TokenValidationResult(false, null, ["Tokens root must be a JSON object."]);
        }

        string id = ReadString(root, ["atelierTheme", "id", "$value"])
            ?? ReadString(root, ["id"])
            ?? "atelier-theme";

        string name = ReadString(root, ["atelierTheme", "name", "$value"])
            ?? ReadString(root, ["name"])
            ?? "Atelier Custom Theme";

        string? brandPrimary = ReadColor(root, ["color", "brand", "primary", "$value"], "brandPrimary", errors, required: true);
        string? brandAccent = ReadColor(root, ["color", "brand", "accent", "$value"], "brandAccent", errors, required: true);
        string? surfaceCanvas = ReadColor(root, ["color", "surface", "canvas", "$value"], "surfaceCanvas", errors, required: true);
        string? surfaceCard = ReadColor(root, ["color", "surface", "card", "$value"], "surfaceCard", errors, required: true);
        string? surfaceElevated = ReadColor(root, ["color", "surface", "elevated", "$value"], "surfaceElevated", errors, required: false) ?? surfaceCard;
        string? borderSubtle = ReadColor(root, ["color", "border", "subtle", "$value"], "borderSubtle", errors, required: false) ?? "#2A3147";
        string? textPrimary = ReadColor(root, ["color", "text", "primary", "$value"], "textPrimary", errors, required: true);
        string? textMuted = ReadColor(root, ["color", "text", "muted", "$value"], "textMuted", errors, required: false) ?? "#94A3B8";

        string success500 = ReadColor(root, ["primitive", "color", "success500", "$value"], "success500", errors, required: false) ?? "#10B981";
        string warning500 = ReadColor(root, ["primitive", "color", "warning500", "$value"], "warning500", errors, required: false) ?? "#F59E0B";
        string danger500 = ReadColor(root, ["primitive", "color", "danger500", "$value"], "danger500", errors, required: false) ?? "#F43F5E";

        string fontDisplay = ReadString(root, ["typography", "display", "$value", "fontFamily"])
            ?? ReadString(root, ["fontDisplay"])
            ?? "Space Grotesk";
        string fontBody = ReadString(root, ["typography", "body", "$value", "fontFamily"])
            ?? ReadString(root, ["fontBody"])
            ?? "Inter";
        string fontMono = ReadString(root, ["typography", "mono", "$value", "fontFamily"])
            ?? ReadString(root, ["fontMono"])
            ?? "JetBrains Mono";

        int displaySize = ReadDimensionPx(root, ["typography", "display", "$value", "fontSize"], 48, 12, 128, "typography.display.fontSize", errors);
        int h1Size = ReadDimensionPx(root, ["typography", "h1", "$value", "fontSize"], 32, 12, 96, "typography.h1.fontSize", errors);
        int h2Size = ReadDimensionPx(root, ["typography", "h2", "$value", "fontSize"], 24, 10, 72, "typography.h2.fontSize", errors);
        int bodySize = ReadDimensionPx(root, ["typography", "body", "$value", "fontSize"], 14, 10, 36, "typography.body.fontSize", errors);
        int captionSize = ReadDimensionPx(root, ["typography", "caption", "$value", "fontSize"], 11, 8, 24, "typography.caption.fontSize", errors);
        int monoSize = ReadDimensionPx(root, ["typography", "mono", "$value", "fontSize"], 11, 8, 24, "typography.mono.fontSize", errors);

        int spacingUnit = ReadDimensionPx(root, ["spacing", "unit", "$value"],
            ReadIntOrDefault(root, "spacingUnit", 8), 2, 32, "spacing.unit", errors);

        int radiusBase = ReadDimensionPx(root, ["dimension", "radius", "base", "$value"],
            ReadIntOrDefault(root, "radiusBase", 16), 0, 64, "dimension.radius.base", errors);

        string shadowSubtle = ReadString(root, ["shadow", "subtle", "$value"]) ?? "0 4px 16px rgba(0, 0, 0, 0.22)";
        string shadowElevated = ReadString(root, ["shadow", "elevated", "$value"]) ?? "0 14px 36px rgba(0, 0, 0, 0.34)";
        string shadowFloating = ReadString(root, ["shadow", "floating", "$value"]) ?? "0 24px 60px rgba(0, 0, 0, 0.45)";
        string shadowNeon = ReadString(root, ["shadow", "neon", "$value"]) ?? "0 12px 32px rgba(99, 102, 241, 0.38)";

        if (errors.Count > 0)
        {
            return new TokenValidationResult(false, null, errors);
        }

        var normalized = new NormalizedDesignTokens(
            Id: id,
            Name: name,
            BrandPrimary: brandPrimary!,
            BrandAccent: brandAccent!,
            SurfaceCanvas: surfaceCanvas!,
            SurfaceCard: surfaceCard!,
            SurfaceElevated: surfaceElevated!,
            BorderSubtle: borderSubtle!,
            TextPrimary: textPrimary!,
            TextMuted: textMuted!,
            Success500: success500,
            Warning500: warning500,
            Danger500: danger500,
            FontDisplay: fontDisplay,
            FontBody: fontBody,
            FontMono: fontMono,
            DisplaySizePx: displaySize,
            H1SizePx: h1Size,
            H2SizePx: h2Size,
            BodySizePx: bodySize,
            CaptionSizePx: captionSize,
            MonoSizePx: monoSize,
            SpacingUnitPx: spacingUnit,
            RadiusBasePx: radiusBase,
            ShadowSubtle: shadowSubtle,
            ShadowElevated: shadowElevated,
            ShadowFloating: shadowFloating,
            ShadowNeon: shadowNeon
        );

        return new TokenValidationResult(true, normalized, []);
    }

    private static string? ReadColor(
        JsonElement root,
        string[] dtcgPath,
        string flatFallbackKey,
        List<string> errors,
        bool required)
    {
        var raw = ReadString(root, dtcgPath) ?? ReadString(root, [flatFallbackKey]);
        if (string.IsNullOrWhiteSpace(raw))
        {
            if (required)
            {
                errors.Add($"Missing required color token '{string.Join('.', dtcgPath)}' (or '{flatFallbackKey}').");
            }
            return null;
        }

        if (!WcagContrastAuditor.TryParseHexRgb(raw, out _))
        {
            errors.Add($"Invalid hex color '{raw}' for token '{flatFallbackKey}'. Expected #RGB or #RRGGBB.");
            return null;
        }

        return WcagContrastAuditor.NormalizeHex6(raw);
    }

    private static int ReadDimensionPx(
        JsonElement root,
        string[] path,
        int defaultVal,
        int min,
        int max,
        string label,
        List<string> errors)
    {
        if (!TryGetPath(root, path, out var el)) return defaultVal;

        int parsed;
        if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var num))
        {
            parsed = num;
        }
        else if (el.ValueKind == JsonValueKind.String)
        {
            var s = (el.GetString() ?? "").Trim().ToLowerInvariant();
            if (s.EndsWith("px", StringComparison.Ordinal)) s = s[..^2];
            if (!double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
            {
                errors.Add($"Invalid dimension value '{el.GetString()}' for '{label}'.");
                return defaultVal;
            }
            parsed = (int)Math.Round(d, MidpointRounding.AwayFromZero);
        }
        else
        {
            errors.Add($"Unsupported JSON type for dimension '{label}'.");
            return defaultVal;
        }

        if (parsed < min || parsed > max)
        {
            errors.Add($"Dimension '{label}' ({parsed}px) must be between {min}px and {max}px.");
            return defaultVal;
        }

        return parsed;
    }

    private static int ReadIntOrDefault(JsonElement root, string key, int defaultVal)
    {
        if (root.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var val))
        {
            return val;
        }
        return defaultVal;
    }

    private static string? ReadString(JsonElement root, string[] path)
    {
        if (!TryGetPath(root, path, out var el)) return null;
        return el.ValueKind == JsonValueKind.String ? el.GetString() : null;
    }

    private static bool TryGetPath(JsonElement root, string[] path, out JsonElement value)
    {
        var current = root;
        foreach (var segment in path)
        {
            if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(segment, out var next))
            {
                value = default;
                return false;
            }
            current = next;
        }
        value = current;
        return true;
    }
}
