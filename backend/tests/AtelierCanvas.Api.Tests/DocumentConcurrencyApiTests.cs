using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AtelierCanvas.Domain.Models;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AtelierCanvas.Api.Tests;

public sealed class DocumentConcurrencyApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public DocumentConcurrencyApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private static JsonElement SamplePayload(string label)
    {
        using var doc = JsonDocument.Parse($$"""
        {
          "artboard": { "id": "ab-1", "name": "{{label}}", "width": 1080, "height": 680 },
          "nodes": [
            { "id": "node-1", "type": "rect", "x": 40, "y": 60, "width": 200, "height": 120 }
          ]
        }
        """);
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsHealthyNet10Metadata()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("healthy", json.GetProperty("status").GetString());
        Assert.Equal("AtelierCanvas.Api", json.GetProperty("service").GetString());
        Assert.Equal("5.0.0", json.GetProperty("version").GetString());
        Assert.Contains(".NET 10", json.GetProperty("runtime").GetString());
    }

    [Fact]
    public async Task GetDocument_SeededStudioDoc_ReturnsVersion1AndETagHeader()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/documents/atelier-studio-main");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("\"1\"", response.Headers.ETag?.Tag);

        var snapshot = await response.Content.ReadFromJsonAsync<CanvasDocumentSnapshot>(JsonOpts);
        Assert.NotNull(snapshot);
        Assert.Equal("atelier-studio-main", snapshot.DocId);
        Assert.Equal(1, snapshot.Version);
        Assert.Equal("fintech-spatial", snapshot.TemplateId);
    }

    [Fact]
    public async Task GetDocument_UnknownId_Returns404NotFound()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync($"/api/v1/documents/missing-{Guid.NewGuid():N}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PutDocument_CreateNewWithExpectedVersionZero_SucceedsAtVersion1()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-create-{Guid.NewGuid():N}";

        var response = await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "luxury-editorial",
            updatedBy = "peer-alpha",
            payload = SamplePayload("Editorial Spread")
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("\"1\"", response.Headers.ETag?.Tag);

        var created = await response.Content.ReadFromJsonAsync<CanvasDocumentSnapshot>(JsonOpts);
        Assert.NotNull(created);
        Assert.Equal(1, created.Version);
        Assert.Equal("peer-alpha", created.UpdatedBy);
    }

    [Fact]
    public async Task PutDocument_SequentialBodyExpectedVersions_IncrementsMonotonically()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-seq-{Guid.NewGuid():N}";

        var r1 = await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "fintech-spatial",
            updatedBy = "tab-1",
            payload = SamplePayload("Rev 1")
        });
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);

        var r2 = await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 1,
            templateId = "fintech-spatial",
            updatedBy = "tab-2",
            payload = SamplePayload("Rev 2")
        });
        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
        Assert.Equal("\"2\"", r2.Headers.ETag?.Tag);

        var r3 = await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 2,
            templateId = "fintech-spatial",
            updatedBy = "tab-1",
            payload = SamplePayload("Rev 3")
        });
        Assert.Equal(HttpStatusCode.OK, r3.StatusCode);
        var snap3 = await r3.Content.ReadFromJsonAsync<CanvasDocumentSnapshot>(JsonOpts);
        Assert.Equal(3, snap3!.Version);
    }

    [Fact]
    public async Task PutDocument_WithIfMatchHeader_IncrementsVersionAndUpdatesETag()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-ifmatch-{Guid.NewGuid():N}";

        await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "ai-saas-hero",
            updatedBy = "tab-1",
            payload = SamplePayload("Initial")
        });

        using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/documents/{docId}")
        {
            Content = JsonContent.Create(new
            {
                templateId = "ai-saas-hero",
                updatedBy = "tab-2",
                payload = SamplePayload("Updated via If-Match")
            })
        };
        req.Headers.TryAddWithoutValidation("If-Match", "\"1\"");

        var response = await client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("\"2\"", response.Headers.ETag?.Tag);

        var updated = await response.Content.ReadFromJsonAsync<CanvasDocumentSnapshot>(JsonOpts);
        Assert.Equal(2, updated!.Version);
    }

    [Fact]
    public async Task PutDocument_StaleExpectedVersion_Returns409ConflictWithVectorDetails()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-stale-{Guid.NewGuid():N}";

        await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "fintech-spatial",
            updatedBy = "tab-a",
            payload = SamplePayload("v1")
        });

        await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 1,
            templateId = "fintech-spatial",
            updatedBy = "tab-a",
            payload = SamplePayload("v2")
        });

        // Stale writer still holds version 1 -> MUST reject with 409 Conflict!
        var conflictResp = await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 1,
            templateId = "fintech-spatial",
            updatedBy = "tab-b-stale",
            payload = SamplePayload("stale overwrite attempt")
        });

        Assert.Equal(HttpStatusCode.Conflict, conflictResp.StatusCode);
        Assert.Equal("\"2\"", conflictResp.Headers.ETag?.Tag);

        var err = await conflictResp.Content.ReadFromJsonAsync<DocumentConflictError>(JsonOpts);
        Assert.NotNull(err);
        Assert.Equal("OPTIMISTIC_CONCURRENCY_CONFLICT", err.Code);
        Assert.Equal(1, err.ExpectedVersion);
        Assert.Equal(2, err.CurrentVersion);
        Assert.Equal("\"2\"", err.CurrentETag);
    }

    [Fact]
    public async Task PutDocument_StaleIfMatchHeader_Returns409Conflict()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-stale-etag-{Guid.NewGuid():N}";

        await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "swiss-poster",
            updatedBy = "tab-1",
            payload = SamplePayload("v1")
        });

        using var staleReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/documents/{docId}")
        {
            Content = JsonContent.Create(new
            {
                templateId = "swiss-poster",
                updatedBy = "tab-2",
                payload = SamplePayload("stale header")
            })
        };
        staleReq.Headers.TryAddWithoutValidation("If-Match", "\"0\"");

        var resp = await client.SendAsync(staleReq);
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    [Fact]
    public async Task PutDocument_ConcurrentRaceAtSameVersion_ExactlyOneWinsAndRestGet409()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-race-{Guid.NewGuid():N}";

        await client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
        {
            expectedVersion = 0,
            templateId = "fintech-spatial",
            updatedBy = "seed",
            payload = SamplePayload("base")
        });

        var tasks = Enumerable.Range(0, 6).Select(i =>
            client.PutAsJsonAsync($"/api/v1/documents/{docId}", new
            {
                expectedVersion = 1,
                templateId = "fintech-spatial",
                updatedBy = $"concurrent-peer-{i}",
                payload = SamplePayload($"race-write-{i}")
            })
        ).ToArray();

        var results = await Task.WhenAll(tasks);

        var okCount = results.Count(r => r.StatusCode == HttpStatusCode.OK);
        var conflictCount = results.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.Equal(1, okCount);
        Assert.Equal(5, conflictCount);
    }

    [Fact]
    public async Task PutDocument_InvalidIfMatchHeader_Returns400BadRequest()
    {
        using var client = _factory.CreateClient();
        var docId = $"doc-bad-etag-{Guid.NewGuid():N}";

        using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/documents/{docId}")
        {
            Content = JsonContent.Create(new
            {
                templateId = "fintech-spatial",
                payload = SamplePayload("bad header")
            })
        };
        req.Headers.TryAddWithoutValidation("If-Match", "\"not-a-number\"");

        var resp = await client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
