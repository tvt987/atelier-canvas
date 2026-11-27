using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AtelierCanvas.Domain.Models;
using AtelierCanvas.Domain.Services;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AtelierCanvas.Api.Tests;

public sealed class VariantAuditApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public VariantAuditApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private static JsonElement BuildObsidianProTokens()
    {
        using var doc = JsonDocument.Parse("""
        {
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
          "primitive": {
            "color": {
              "danger500": { "$value": "#F43F5E", "$type": "color" }
            }
          }
        }
        """);
        return doc.RootElement.Clone();
    }

    private static JsonElement BuildSwissEditorialLightTokens()
    {
        using var doc = JsonDocument.Parse("""
        {
          "id": "swiss-editorial-light",
          "name": "Swiss Editorial Light",
          "brandPrimary": "#E11D48",
          "brandAccent": "#0F172A",
          "surfaceCanvas": "#F6F5F0",
          "surfaceCard": "#FFFFFF",
          "surfaceElevated": "#ECEAE3",
          "borderSubtle": "#D6D3C9",
          "textPrimary": "#111318",
          "textMuted": "#57534E",
          "danger500": "#E11D48"
        }
        """);
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task VariantAudit_ObsidianProFullMatrix_EvaluatesAll144CellsAndReturnsComplianceScore()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            targetLevel = "AA"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal("obsidian-pro", report.ThemeId);
        Assert.Equal("AA", report.TargetLevel);
        Assert.Equal(4.5, report.TargetRatio);
        Assert.Equal(144, report.TotalCells);
        Assert.Equal(144, report.Cells.Count);
        Assert.Equal(144, report.PassingCells + report.FailingCells);
        Assert.InRange(report.ComplianceScorePercent, 0.0, 100.0);
        Assert.True(report.FailingCells > 0);
    }

    [Fact]
    public async Task VariantAudit_SwissEditorialLight_ReturnsAccurateLuminanceAndHighContrastMetrics()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildSwissEditorialLightTokens()
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal("swiss-editorial-light", report.ThemeId);

        var inputPrimaryDefault = report.Cells.Single(
            c => c.Id == "metric-input:primary:md:default");
        Assert.True(inputPrimaryDefault.BackgroundLuminance > 0.95);
        Assert.True(inputPrimaryDefault.ForegroundLuminance < 0.02);
        Assert.Equal("AAA", inputPrimaryDefault.Grade);
        Assert.True(inputPrimaryDefault.PassesAAA);
        Assert.Null(inputPrimaryDefault.Recommendation);
    }

    [Fact]
    public async Task VariantAudit_FailingCells_ProvideMathematicallyVerifiedAccessibleRecommendations()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            targetLevel = "AA"
        });

        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        var failing = report.Cells.Where(c => !c.PassesTarget).ToList();
        Assert.NotEmpty(failing);

        foreach (var cell in failing)
        {
            Assert.NotNull(cell.Recommendation);
            var rec = cell.Recommendation!;
            Assert.True(rec.FixedRatio >= 4.5, $"Cell {cell.Id} recommendation failed AA: {rec.FixedRatio}");
            var recomputed = WcagContrastAuditor.ComputeContrastRatio(
                rec.RecommendedForegroundHex,
                rec.RecommendedBackgroundHex);
            Assert.True(recomputed >= 4.5, $"Cell {cell.Id} recomputed ratio failed AA: {recomputed}");
        }
    }

    [Fact]
    public async Task VariantAudit_AAAStrictTarget_RaisesThresholdTo7To1AndComputesAAACompliantFixes()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            targetLevel = "AAA"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal("AAA", report.TargetLevel);
        Assert.Equal(7.0, report.TargetRatio);

        var failing = report.Cells.Where(c => !c.PassesTarget).ToList();
        Assert.NotEmpty(failing);
        foreach (var cell in failing)
        {
            Assert.NotNull(cell.Recommendation);
            Assert.Equal("AAA", cell.Recommendation!.FixedGrade);
            Assert.True(cell.Recommendation.FixedRatio >= 7.0);
        }
    }

    [Fact]
    public async Task VariantAudit_FilteredSinglePrimitive_EvaluatesExact48Cells()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            primitives = new[] { "action-button" }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal(48, report.TotalCells);
        Assert.All(report.Cells, c => Assert.Equal("action-button", c.Primitive));
    }

    [Fact]
    public async Task VariantAudit_FilteredTwoPrimitives_EvaluatesExact96CellsWithoutDuplicates()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            primitives = new[] { "status-badge", "metric-input", "status-badge" }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal(96, report.TotalCells);
    }

    [Fact]
    public async Task VariantAudit_CustomCellsOverride_AuditsExplicitHexPairsAccurately()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            targetLevel = "AA",
            customCells = new[]
            {
                new
                {
                    id = "custom-pass",
                    primitive = "action-button",
                    variant = "primary",
                    size = "md",
                    state = "default",
                    foregroundHex = "#FFFFFF",
                    backgroundHex = "#1E1B4B",
                    borderHex = "#4338CA"
                },
                new
                {
                    id = "custom-fail",
                    primitive = "action-button",
                    variant = "destructive",
                    size = "md",
                    state = "default",
                    foregroundHex = "#FFFFFF",
                    backgroundHex = "#FB7185",
                    borderHex = "#FB7185"
                }
            }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(report);
        Assert.Equal(2, report.TotalCells);
        Assert.Equal(1, report.PassingCells);
        Assert.Equal(1, report.FailingCells);
        Assert.Equal(50.0, report.ComplianceScorePercent);

        var passCell = report.Cells.Single(c => c.Id == "custom-pass");
        Assert.True(passCell.PassesAAA);
        Assert.Null(passCell.Recommendation);

        var failCell = report.Cells.Single(c => c.Id == "custom-fail");
        Assert.False(failCell.PassesAA);
        Assert.NotNull(failCell.Recommendation);
        Assert.True(failCell.Recommendation!.FixedRatio >= 4.5);
    }

    [Fact]
    public async Task VariantAudit_InvalidTargetLevel_Returns400BadRequest()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            targetLevel = "AAAA-ULTRA"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("INVALID_TARGET_LEVEL", error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task VariantAudit_UnsupportedPrimitive_Returns400BadRequest()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            primitives = new[] { "carousel-3d" }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("UNSUPPORTED_PRIMITIVE", error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task VariantAudit_InvalidTokenHex_Returns400WithValidationErrors()
    {
        using var client = _factory.CreateClient();
        using var bad = JsonDocument.Parse("""
        {
          "brandPrimary": "not-valid",
          "brandAccent": "#06B6D4",
          "surfaceCanvas": "#0C0E14",
          "surfaceCard": "#151924",
          "textPrimary": "#F8FAFC"
        }
        """);

        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = bad.RootElement.Clone()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("INVALID_DESIGN_TOKENS", error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task VariantAudit_InvalidCustomCellHex_Returns400BadRequest()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = BuildObsidianProTokens(),
            customCells = new[]
            {
                new
                {
                    id = "bad-hex",
                    primitive = "action-button",
                    variant = "primary",
                    size = "md",
                    state = "default",
                    foregroundHex = "rgb(255,0,0)",
                    backgroundHex = "#111111"
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("INVALID_CELL_COLOR", error.GetProperty("code").GetString());
    }

    [Fact]
    public async Task VariantAudit_ApplyingRecommendedTokenOverrides_IncreasesComplianceScore()
    {
        using var client = _factory.CreateClient();
        using var lowContrastDoc = JsonDocument.Parse("""
        {
          "id": "low-contrast-audit",
          "name": "Low Contrast Audit",
          "brandPrimary": "#818CF8",
          "brandAccent": "#38BDF8",
          "surfaceCanvas": "#0C0E14",
          "surfaceCard": "#151924",
          "surfaceElevated": "#1D2232",
          "borderSubtle": "#2A3147",
          "textPrimary": "#F8FAFC",
          "textMuted": "#475569",
          "danger500": "#FB7185"
        }
        """);

        var initialResp = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = lowContrastDoc.RootElement.Clone(),
            targetLevel = "AA"
        });
        var initial = await initialResp.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(initial);
        Assert.True(initial.RecommendedTokenOverrides.ContainsKey("brandPrimary"));
        Assert.True(initial.RecommendedTokenOverrides.ContainsKey("danger500"));

        var fixedBrand = initial.RecommendedTokenOverrides["brandPrimary"];
        var fixedDanger = initial.RecommendedTokenOverrides["danger500"];
        var fixedMuted = initial.RecommendedTokenOverrides.GetValueOrDefault("textMuted", "#94A3B8");

        using var improvedDoc = JsonDocument.Parse($$"""
        {
          "id": "low-contrast-audit",
          "name": "Low Contrast Audit",
          "brandPrimary": "{{fixedBrand}}",
          "brandAccent": "#38BDF8",
          "surfaceCanvas": "#0C0E14",
          "surfaceCard": "#151924",
          "surfaceElevated": "#1D2232",
          "borderSubtle": "#2A3147",
          "textPrimary": "#F8FAFC",
          "textMuted": "{{fixedMuted}}",
          "danger500": "{{fixedDanger}}"
        }
        """);

        var improvedResp = await client.PostAsJsonAsync("/api/v1/design/variant-audit", new
        {
            tokens = improvedDoc.RootElement.Clone(),
            targetLevel = "AA"
        });
        var improved = await improvedResp.Content.ReadFromJsonAsync<VariantMatrixAuditResponse>(JsonOpts);
        Assert.NotNull(improved);
        Assert.True(
            improved.ComplianceScorePercent > initial.ComplianceScorePercent,
            $"Expected score to improve from {initial.ComplianceScorePercent}% -> {improved.ComplianceScorePercent}%");
    }
}
