using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AtelierCanvas.Domain.Models;
using AtelierCanvas.Domain.Services;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AtelierCanvas.Api.Tests;

public sealed class TokenCompilerAndWcagApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public TokenCompilerAndWcagApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private static JsonElement BuildObsidianProW3CTokens()
    {
        using var doc = JsonDocument.Parse("""
        {
          "$schema": "https://design-tokens.org/schemas/v1/tokens.json",
          "atelierTheme": {
            "id": { "$value": "obsidian-pro", "$type": "string" },
            "name": { "$value": "Obsidian Pro", "$type": "string" }
          },
          "color": {
            "brand": {
              "primary": { "$value": "#6366F1", "$type": "color" },
              "accent": { "$value": "#06B6D4", "$type": "color" }
            },
            "surface": {
              "canvas": { "$value": "#0C0E14", "$type": "color" },
              "card": { "$value": "#151924", "$type": "color" },
              "elevated": { "$value": "#1D2232", "$type": "color" }
            },
            "border": {
              "subtle": { "$value": "#2A3147", "$type": "color" }
            },
            "text": {
              "primary": { "$value": "#F8FAFC", "$type": "color" },
              "muted": { "$value": "#94A3B8", "$type": "color" }
            }
          },
          "typography": {
            "display": { "$type": "typography", "$value": { "fontFamily": "Space Grotesk", "fontSize": "48px" } },
            "h1": { "$type": "typography", "$value": { "fontFamily": "Space Grotesk", "fontSize": "32px" } },
            "body": { "$type": "typography", "$value": { "fontFamily": "Inter", "fontSize": "14px" } },
            "mono": { "$type": "typography", "$value": { "fontFamily": "JetBrains Mono", "fontSize": "11px" } }
          },
          "spacing": {
            "unit": { "$value": "8px", "$type": "dimension" }
          },
          "dimension": {
            "radius": {
              "base": { "$value": "16px", "$type": "dimension" }
            }
          }
        }
        """);
        return doc.RootElement.Clone();
    }

    private static JsonElement BuildSwissEditorialLightW3CTokens()
    {
        using var doc = JsonDocument.Parse("""
        {
          "atelierTheme": {
            "id": { "$value": "swiss-editorial-light", "$type": "string" },
            "name": { "$value": "Swiss Editorial Light", "$type": "string" }
          },
          "color": {
            "brand": {
              "primary": { "$value": "#E11D48", "$type": "color" },
              "accent": { "$value": "#0F172A", "$type": "color" }
            },
            "surface": {
              "canvas": { "$value": "#F6F5F0", "$type": "color" },
              "card": { "$value": "#FFFFFF", "$type": "color" },
              "elevated": { "$value": "#ECEAE3", "$type": "color" }
            },
            "border": {
              "subtle": { "$value": "#D6D3C9", "$type": "color" }
            },
            "text": {
              "primary": { "$value": "#111318", "$type": "color" },
              "muted": { "$value": "#57534E", "$type": "color" }
            }
          },
          "spacing": { "unit": { "$value": "8px", "$type": "dimension" } },
          "dimension": { "radius": { "base": { "$value": "6px", "$type": "dimension" } } }
        }
        """);
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task CompileTokens_AllFourTargets_ReturnsValidCssTsSwiftAndComposeArtifacts()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens()
        });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var compiled = await resp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        Assert.NotNull(compiled);
        Assert.Equal("obsidian-pro", compiled.ThemeId);
        Assert.Equal("dark", compiled.ColorScheme);
        Assert.Equal(4, compiled.Outputs.Count);
        Assert.True(compiled.Outputs.ContainsKey("css"));
        Assert.True(compiled.Outputs.ContainsKey("typescript"));
        Assert.True(compiled.Outputs.ContainsKey("swiftui"));
        Assert.True(compiled.Outputs.ContainsKey("compose"));
    }

    [Fact]
    public async Task CompileTokens_CssTarget_EmitsValidTailwindV4ThemeDirectives()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens(),
            targets = new[] { "css" }
        });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var compiled = await resp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        var css = compiled!.Outputs["css"];

        Assert.Equal("obsidian-pro.theme.css", css.Filename);
        Assert.Contains("@import \"tailwindcss\";", css.Code);
        Assert.Contains("@theme {", css.Code);
        Assert.Contains("--color-brand-primary: #6366F1;", css.Code);
        Assert.Contains("--spacing-md: 16px;", css.Code);
        Assert.Contains("--radius-base: 16px;", css.Code);
    }

    [Fact]
    public async Task CompileTokens_TypeScriptTarget_EmitsStrictlyTypedAsConstConstants()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens(),
            targets = new[] { "typescript" }
        });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var compiled = await resp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        var ts = compiled!.Outputs["typescript"];

        Assert.Equal("obsidian-pro.tokens.ts", ts.Filename);
        Assert.Contains("export const ObsidianProTokens = {", ts.Code);
        Assert.Contains("brandPrimary: '#6366F1'", ts.Code);
        Assert.Contains("} as const;", ts.Code);
        Assert.Contains("export type AtelierColorToken = keyof AtelierDesignTokens['color'];", ts.Code);
    }

    [Fact]
    public async Task CompileTokens_SwiftUiTarget_EmitsColorHexAndCgFloatExtensions()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens(),
            targets = new[] { "swiftui" }
        });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var compiled = await resp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        var swift = compiled!.Outputs["swiftui"];

        Assert.Equal("ObsidianProTheme.swift", swift.Filename);
        Assert.Contains("import SwiftUI", swift.Code);
        Assert.Contains("public extension Color {", swift.Code);
        Assert.Contains("Color(atelierHex: 0x6366F1)", swift.Code);
        Assert.Contains("public extension CGFloat {", swift.Code);
        Assert.Contains("atelierRadiusBase: CGFloat = 16.0", swift.Code);
    }

    [Fact]
    public async Task CompileTokens_ComposeTarget_SwitchesBetweenDarkAndLightColorSchemes()
    {
        using var client = _factory.CreateClient();

        var darkResp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens(),
            targets = new[] { "compose" }
        });
        var darkData = await darkResp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        Assert.Contains("darkColorScheme(", darkData!.Outputs["compose"].Code);
        Assert.Contains("Color(0xFF6366F1)", darkData.Outputs["compose"].Code);

        var lightResp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildSwissEditorialLightW3CTokens(),
            targets = new[] { "compose" }
        });
        var lightData = await lightResp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        Assert.Equal("light", lightData!.ColorScheme);
        Assert.Contains("lightColorScheme(", lightData.Outputs["compose"].Code);
        Assert.Contains("Color(0xFFE11D48)", lightData.Outputs["compose"].Code);
        Assert.Contains("val Base: Dp = 6.dp", lightData.Outputs["compose"].Code);
    }

    [Fact]
    public async Task CompileTokens_InvalidHexColor_Returns400WithValidationErrors()
    {
        using var client = _factory.CreateClient();
        using var bad = JsonDocument.Parse("""
        {
          "brandPrimary": "not-a-hex",
          "brandAccent": "#06B6D4",
          "surfaceCanvas": "#0C0E14",
          "surfaceCard": "#151924",
          "textPrimary": "#F8FAFC"
        }
        """);

        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = bad.RootElement.Clone()
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("INVALID_DESIGN_TOKENS", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("errors").GetArrayLength() >= 1);
    }

    [Fact]
    public async Task CompileTokens_UnsupportedTargetName_Returns400BadRequest()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens(),
            targets = new[] { "cobol-mainframe" }
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("UNSUPPORTED_TARGET", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task CompileTokens_ReturnsFullWcag21AuditReportWithGradesAndPassRate()
    {
        using var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/tokens/compile", new
        {
            tokens = BuildObsidianProW3CTokens()
        });

        var compiled = await resp.Content.ReadFromJsonAsync<TokenCompilationResponse>(JsonOpts);
        Assert.NotNull(compiled?.WcagReport);
        Assert.Equal(5, compiled!.WcagReport.TotalPairs);
        Assert.True(compiled.WcagReport.AaPassCount >= 4);
        Assert.True(compiled.WcagReport.PassRatePercent >= 80);

        var primaryOnCanvas = compiled.WcagReport.Pairs.Single(p => p.Id == "text-on-canvas");
        Assert.Equal("AAA", primaryOnCanvas.Grade);
        Assert.True(primaryOnCanvas.PassesAAA);
        Assert.True(primaryOnCanvas.Ratio > 15.0);
    }

    [Fact]
    public void WcagAuditor_BlackAndWhite_EqualsExact21To1AAA()
    {
        var ratio = WcagContrastAuditor.ComputeContrastRatio("#FFFFFF", "#000000");
        Assert.Equal(21.0, ratio);

        var audit = WcagContrastAuditor.EvaluatePair("bw", "White on Black", "#FFF", "#000");
        Assert.Equal("AAA", audit.Grade);
        Assert.True(audit.PassesAA);
        Assert.True(audit.PassesAAA);
        Assert.Equal("21.0:1", audit.RatioLabel);
    }

    [Fact]
    public void WcagAuditor_MidGrayOnWhite_MeetsAAButNotAAA()
    {
        // #767676 on #FFFFFF is the canonical WCAG 2.1 AA boundary (~4.54:1)
        var audit = WcagContrastAuditor.EvaluatePair("aa-boundary", "AA Gray", "#767676", "#FFFFFF");
        Assert.Equal("AA", audit.Grade);
        Assert.True(audit.PassesAA);
        Assert.False(audit.PassesAAA);
        Assert.InRange(audit.Ratio, 4.5, 4.7);
    }

    [Fact]
    public void WcagAuditor_LowContrastDarkSlatePair_FailsAA()
    {
        var audit = WcagContrastAuditor.EvaluatePair("low", "Low Slate", "#334155", "#1E293B");
        Assert.Equal("FAIL", audit.Grade);
        Assert.False(audit.PassesAA);
        Assert.False(audit.PassesAAA);
        Assert.True(audit.Ratio < 3.0);
    }

    [Fact]
    public void W3CValidator_AcceptsThreeDigitShorthandHexAndNormalizesToSixDigitUppercase()
    {
        using var doc = JsonDocument.Parse("""
        {
          "id": "compact-theme",
          "name": "Compact Theme",
          "brandPrimary": "#f0a",
          "brandAccent": "#0ff",
          "surfaceCanvas": "#111",
          "surfaceCard": "#222",
          "textPrimary": "#fff"
        }
        """);

        var result = W3CTokenValidator.ValidateAndNormalize(doc.RootElement);
        Assert.True(result.IsValid);
        Assert.Equal("#FF00AA", result.Normalized!.BrandPrimary);
        Assert.Equal("#00FFFF", result.Normalized.BrandAccent);
        Assert.Equal("#FFFFFF", result.Normalized.TextPrimary);
    }
}
