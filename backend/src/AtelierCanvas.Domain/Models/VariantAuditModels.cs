using System.Text.Json;

namespace AtelierCanvas.Domain.Models;

public sealed record VariantCellInput(
    string Id,
    string Primitive,
    string Variant,
    string Size,
    string State,
    string ForegroundHex,
    string BackgroundHex,
    string? BorderHex = null
);

public sealed record VariantAuditRequest(
    JsonElement Tokens,
    string? TargetLevel = null,
    IReadOnlyList<string>? Primitives = null,
    IReadOnlyList<VariantCellInput>? CustomCells = null
);

public sealed record AccessibleColorRecommendation(
    string RecommendedForegroundHex,
    string RecommendedBackgroundHex,
    double OriginalRatio,
    double FixedRatio,
    string FixedGrade,
    string Strategy
);

public sealed record VariantCellAuditResult(
    string Id,
    string Primitive,
    string Variant,
    string Size,
    string State,
    string ForegroundHex,
    string BackgroundHex,
    string BorderHex,
    double ForegroundLuminance,
    double BackgroundLuminance,
    double ContrastRatio,
    string RatioLabel,
    string Grade,
    bool PassesAA,
    bool PassesAAA,
    bool PassesTarget,
    AccessibleColorRecommendation? Recommendation
);

public sealed record VariantMatrixAuditResponse(
    string ThemeId,
    string ThemeName,
    string TargetLevel,
    double TargetRatio,
    int TotalCells,
    int PassingCells,
    int FailingCells,
    int AaPassCount,
    int AaaPassCount,
    double ComplianceScorePercent,
    IReadOnlyDictionary<string, string> RecommendedTokenOverrides,
    IReadOnlyList<VariantCellAuditResult> Cells,
    DateTimeOffset AuditedAtUtc
);
