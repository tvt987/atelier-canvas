using System.Text;
using System.Text.RegularExpressions;
using AtelierCanvas.Domain.Models;

namespace AtelierCanvas.Domain.Services;

public static partial class MultiPlatformTokenCompiler
{
    public static readonly string[] AllTargets = ["css", "typescript", "swiftui", "compose"];

    public static TokenCompilationResponse Compile(
        NormalizedDesignTokens tokens,
        IReadOnlyList<string>? requestedTargets = null)
    {
        var selectedTargets = (requestedTargets is { Count: > 0 }
            ? requestedTargets.Select(NormalizeTargetName).Distinct(StringComparer.OrdinalIgnoreCase)
            : AllTargets).ToList();

        var isLight = WcagContrastAuditor.RelativeLuminance(tokens.SurfaceCanvas) > 0.42;
        var outputs = new Dictionary<string, CompiledTokenOutput>(StringComparer.OrdinalIgnoreCase);

        foreach (var target in selectedTargets)
        {
            outputs[target] = target switch
            {
                "css" => BuildCssArtifact(tokens),
                "typescript" => BuildTypeScriptArtifact(tokens, isLight),
                "swiftui" => BuildSwiftUiArtifact(tokens),
                "compose" => BuildComposeArtifact(tokens, isLight),
                _ => throw new ArgumentException($"Unsupported compilation target '{target}'. Supported: css, typescript, swiftui, compose.")
            };
        }

        var wcag = WcagContrastAuditor.AuditTokenSet(tokens);

        return new TokenCompilationResponse(
            ThemeId: tokens.Id,
            ThemeName: tokens.Name,
            ColorScheme: isLight ? "light" : "dark",
            Outputs: outputs,
            WcagReport: wcag,
            CompiledAtUtc: DateTimeOffset.UtcNow
        );
    }

    public static string NormalizeTargetName(string raw) => raw.Trim().ToLowerInvariant() switch
    {
        "tailwind" or "tailwind-v4" or "css" => "css",
        "ts" or "typescript" => "typescript",
        "swift" or "swiftui" or "ios" => "swiftui",
        "kt" or "kotlin" or "compose" or "android" => "compose",
        var other => other
    };

    private static CompiledTokenOutput BuildCssArtifact(NormalizedDesignTokens t)
    {
        var slug = ToSlug(t.Id);
        var u = t.SpacingUnitPx;
        var r = t.RadiusBasePx;
        var code = $$"""
/* Atelier Canvas v5.0 (.NET 10 Compiler) — Tailwind CSS v4 @theme Output
 * Theme: {{t.Name}} ({{t.Id}}) */
@import "tailwindcss";

@theme {
  --color-brand-primary: {{t.BrandPrimary}};
  --color-brand-accent: {{t.BrandAccent}};
  --color-surface-canvas: {{t.SurfaceCanvas}};
  --color-surface-card: {{t.SurfaceCard}};
  --color-surface-elevated: {{t.SurfaceElevated}};
  --color-border-subtle: {{t.BorderSubtle}};
  --color-text-primary: {{t.TextPrimary}};
  --color-text-muted: {{t.TextMuted}};
  --color-signal-success: {{t.Success500}};
  --color-signal-warning: {{t.Warning500}};
  --color-signal-danger: {{t.Danger500}};

  --font-display: "{{t.FontDisplay}}", system-ui, sans-serif;
  --font-sans: "{{t.FontBody}}", system-ui, sans-serif;
  --font-mono: "{{t.FontMono}}", ui-monospace, monospace;
  --text-display: {{t.DisplaySizePx}}px;
  --text-h1: {{t.H1SizePx}}px;
  --text-h2: {{t.H2SizePx}}px;
  --text-body: {{t.BodySizePx}}px;
  --text-caption: {{t.CaptionSizePx}}px;

  --spacing-unit: {{u}}px;
  --spacing-xs: {{Math.Max(2, u / 2)}}px;
  --spacing-sm: {{u}}px;
  --spacing-md: {{u * 2}}px;
  --spacing-lg: {{u * 3}}px;
  --spacing-xl: {{u * 4}}px;
  --spacing-2xl: {{u * 6}}px;

  --radius-sm: {{Math.Max(2, r / 2)}}px;
  --radius-base: {{r}}px;
  --radius-lg: {{(int)Math.Round(r * 1.5)}}px;
  --radius-xl: {{r * 2}}px;

  --shadow-subtle: {{t.ShadowSubtle}};
  --shadow-elevated: {{t.ShadowElevated}};
  --shadow-floating: {{t.ShadowFloating}};
  --shadow-neon: {{t.ShadowNeon}};
}
""";
        return CreateOutput("css", "Web / Tailwind v4", $"{slug}.theme.css", "css", "text/css;charset=utf-8", code);
    }

    private static CompiledTokenOutput BuildTypeScriptArtifact(NormalizedDesignTokens t, bool isLight)
    {
        var slug = ToSlug(t.Id);
        var pascal = ToPascalCase(t.Id);
        var u = t.SpacingUnitPx;
        var r = t.RadiusBasePx;
        var scheme = isLight ? "light" : "dark";
        var code = $$"""
// Atelier Canvas v5.0 (.NET 10 Compiler) — Strictly-Typed Theme Constants
export const {{pascal}}Tokens = {
  meta: {
    id: '{{t.Id}}',
    name: '{{t.Name}}',
    colorScheme: '{{scheme}}',
    version: '5.0.0',
  },
  color: {
    brandPrimary: '{{t.BrandPrimary}}',
    brandAccent: '{{t.BrandAccent}}',
    surfaceCanvas: '{{t.SurfaceCanvas}}',
    surfaceCard: '{{t.SurfaceCard}}',
    surfaceElevated: '{{t.SurfaceElevated}}',
    borderSubtle: '{{t.BorderSubtle}}',
    textPrimary: '{{t.TextPrimary}}',
    textMuted: '{{t.TextMuted}}',
    success: '{{t.Success500}}',
    warning: '{{t.Warning500}}',
    danger: '{{t.Danger500}}',
  },
  typography: {
    display: { fontFamily: '{{t.FontDisplay}}', fontSize: {{t.DisplaySizePx}} },
    h1: { fontFamily: '{{t.FontDisplay}}', fontSize: {{t.H1SizePx}} },
    h2: { fontFamily: '{{t.FontDisplay}}', fontSize: {{t.H2SizePx}} },
    body: { fontFamily: '{{t.FontBody}}', fontSize: {{t.BodySizePx}} },
    caption: { fontFamily: '{{t.FontBody}}', fontSize: {{t.CaptionSizePx}} },
    mono: { fontFamily: '{{t.FontMono}}', fontSize: {{t.MonoSizePx}} },
  },
  spacing: {
    unit: {{u}},
    xs: {{Math.Max(2, u / 2)}},
    sm: {{u}},
    md: {{u * 2}},
    lg: {{u * 3}},
    xl: {{u * 4}},
  },
  radius: {
    sm: {{Math.Max(2, r / 2)}},
    base: {{r}},
    lg: {{(int)Math.Round(r * 1.5)}},
    xl: {{r * 2}},
  },
} as const;

export type AtelierDesignTokens = typeof {{pascal}}Tokens;
export type AtelierColorToken = keyof AtelierDesignTokens['color'];
""";
        return CreateOutput("typescript", "React / TypeScript", $"{slug}.tokens.ts", "typescript", "text/plain;charset=utf-8", code);
    }

    private static CompiledTokenOutput BuildSwiftUiArtifact(NormalizedDesignTokens t)
    {
        var pascal = ToPascalCase(t.Id);
        var u = t.SpacingUnitPx;
        var r = t.RadiusBasePx;
        var code = $$"""
// Atelier Canvas v5.0 (.NET 10 Compiler) — iOS SwiftUI Design System Extensions
import SwiftUI

public extension Color {
    init(atelierHex hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }

    static let atelierBrandPrimary    = Color(atelierHex: 0x{{StripHash(t.BrandPrimary)}})
    static let atelierBrandAccent     = Color(atelierHex: 0x{{StripHash(t.BrandAccent)}})
    static let atelierSurfaceCanvas   = Color(atelierHex: 0x{{StripHash(t.SurfaceCanvas)}})
    static let atelierSurfaceCard     = Color(atelierHex: 0x{{StripHash(t.SurfaceCard)}})
    static let atelierSurfaceElevated = Color(atelierHex: 0x{{StripHash(t.SurfaceElevated)}})
    static let atelierBorderSubtle    = Color(atelierHex: 0x{{StripHash(t.BorderSubtle)}})
    static let atelierTextPrimary     = Color(atelierHex: 0x{{StripHash(t.TextPrimary)}})
    static let atelierTextMuted       = Color(atelierHex: 0x{{StripHash(t.TextMuted)}})
}

public extension CGFloat {
    static let atelierSpaceUnit: CGFloat = {{u}}.0
    static let atelierSpaceMD: CGFloat   = {{u * 2}}.0
    static let atelierSpaceLG: CGFloat   = {{u * 3}}.0
    static let atelierRadiusBase: CGFloat = {{r}}.0
    static let atelierRadiusLG: CGFloat   = {{(int)Math.Round(r * 1.5)}}.0
}
""";
        return CreateOutput("swiftui", "iOS / macOS SwiftUI", $"{pascal}Theme.swift", "swift", "text/plain;charset=utf-8", code);
    }

    private static CompiledTokenOutput BuildComposeArtifact(NormalizedDesignTokens t, bool isLight)
    {
        var u = t.SpacingUnitPx;
        var r = t.RadiusBasePx;
        var schemeFn = isLight ? "lightColorScheme" : "darkColorScheme";
        var code = $$"""
// Atelier Canvas v5.0 (.NET 10 Compiler) — Android Jetpack Compose Theme.kt
package com.ateliercanvas.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.{{schemeFn}}
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object AtelierColors {
    val BrandPrimary: Color    = Color(0xFF{{StripHash(t.BrandPrimary)}})
    val BrandAccent: Color     = Color(0xFF{{StripHash(t.BrandAccent)}})
    val SurfaceCanvas: Color   = Color(0xFF{{StripHash(t.SurfaceCanvas)}})
    val SurfaceCard: Color     = Color(0xFF{{StripHash(t.SurfaceCard)}})
    val SurfaceElevated: Color = Color(0xFF{{StripHash(t.SurfaceElevated)}})
    val BorderSubtle: Color    = Color(0xFF{{StripHash(t.BorderSubtle)}})
    val TextPrimary: Color     = Color(0xFF{{StripHash(t.TextPrimary)}})
    val TextMuted: Color       = Color(0xFF{{StripHash(t.TextMuted)}})
    val Danger: Color          = Color(0xFF{{StripHash(t.Danger500)}})
}

object AtelierSpacing {
    val Unit: Dp = {{u}}.dp
    val Md: Dp   = {{u * 2}}.dp
    val Lg: Dp   = {{u * 3}}.dp
}

object AtelierRadii {
    val Base: Dp = {{r}}.dp
    val Lg: Dp   = {{(int)Math.Round(r * 1.5)}}.dp
}

object AtelierTypeSizes {
    val Display: TextUnit = {{t.DisplaySizePx}}.sp
    val H1: TextUnit      = {{t.H1SizePx}}.sp
    val Body: TextUnit    = {{t.BodySizePx}}.sp
}

val AtelierColorScheme = {{schemeFn}}(
    primary = AtelierColors.BrandPrimary,
    secondary = AtelierColors.BrandAccent,
    background = AtelierColors.SurfaceCanvas,
    surface = AtelierColors.SurfaceCard,
    outline = AtelierColors.BorderSubtle,
    onBackground = AtelierColors.TextPrimary,
    onSurface = AtelierColors.TextPrimary,
    error = AtelierColors.Danger,
)

@Composable
fun AtelierTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = AtelierColorScheme, content = content)
}
""";
        return CreateOutput("compose", "Android / Jetpack Compose", "Theme.kt", "kotlin", "text/plain;charset=utf-8", code);
    }

    private static CompiledTokenOutput CreateOutput(
        string target,
        string platform,
        string filename,
        string language,
        string mimeType,
        string code)
    {
        var normalized = code.Replace("\r\n", "\n");
        return new CompiledTokenOutput(
            Target: target,
            Platform: platform,
            Filename: filename,
            Language: language,
            MimeType: mimeType,
            Code: normalized,
            LineCount: normalized.Split('\n').Length,
            ByteLength: Encoding.UTF8.GetByteCount(normalized)
        );
    }

    private static string StripHash(string hex) => hex.TrimStart('#').ToUpperInvariant();

    private static string ToSlug(string input)
    {
        var slug = NonAlphaNumRegex().Replace(input.ToLowerInvariant(), "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? "atelier" : slug;
    }

    private static string ToPascalCase(string input)
    {
        var parts = NonAlphaNumRegex().Split(input)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => char.ToUpperInvariant(s[0]) + s[1..].ToLowerInvariant());
        var joined = string.Concat(parts);
        return string.IsNullOrEmpty(joined) ? "Atelier" : joined;
    }

    [GeneratedRegex("[^a-zA-Z0-9]+")]
    private static partial Regex NonAlphaNumRegex();
}
