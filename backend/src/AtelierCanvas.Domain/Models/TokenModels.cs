using System.Text.Json;

namespace AtelierCanvas.Domain.Models;

public sealed record TokenCompilationRequest(
    JsonElement Tokens,
    IReadOnlyList<string>? Targets = null
);

public sealed record NormalizedDesignTokens(
    string Id,
    string Name,
    string BrandPrimary,
    string BrandAccent,
    string SurfaceCanvas,
    string SurfaceCard,
    string SurfaceElevated,
    string BorderSubtle,
    string TextPrimary,
    string TextMuted,
    string Success500,
    string Warning500,
    string Danger500,
    string FontDisplay,
    string FontBody,
    string FontMono,
    int DisplaySizePx,
    int H1SizePx,
    int H2SizePx,
    int BodySizePx,
    int CaptionSizePx,
    int MonoSizePx,
    int SpacingUnitPx,
    int RadiusBasePx,
    string ShadowSubtle,
    string ShadowElevated,
    string ShadowFloating,
    string ShadowNeon
);

public sealed record TokenValidationResult(
    bool IsValid,
    NormalizedDesignTokens? Normalized,
    IReadOnlyList<string> Errors
);

public sealed record CompiledTokenOutput(
    string Target,
    string Platform,
    string Filename,
    string Language,
    string MimeType,
    string Code,
    int LineCount,
    int ByteLength
);

public sealed record WcagPairAudit(
    string Id,
    string Label,
    string ForegroundHex,
    string BackgroundHex,
    double Ratio,
    string RatioLabel,
    string Grade,
    bool PassesAA,
    bool PassesAAA
);

public sealed record WcagAuditReport(
    IReadOnlyList<WcagPairAudit> Pairs,
    int AaPassCount,
    int AaaPassCount,
    int TotalPairs,
    int PassRatePercent
);

public sealed record TokenCompilationResponse(
    string ThemeId,
    string ThemeName,
    string ColorScheme,
    IReadOnlyDictionary<string, CompiledTokenOutput> Outputs,
    WcagAuditReport WcagReport,
    DateTimeOffset CompiledAtUtc
);
