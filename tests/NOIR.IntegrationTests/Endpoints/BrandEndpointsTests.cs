using NOIR.Application.Features.Brands.DTOs;

namespace NOIR.IntegrationTests.Endpoints;

/// <summary>
/// Integration tests for brand management endpoints.
/// Tests the full HTTP request/response cycle with real middleware and handlers.
/// </summary>
[Collection("Integration")]
public class BrandEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BrandEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateTestClient();
    }

    private async Task<HttpClient> GetAdminClientAsync()
    {
        var loginCommand = new LoginCommand("admin@noir.local", "123qwe");
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginCommand);
        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
        return _factory.CreateAuthenticatedClient(loginResponse!.Auth!.AccessToken);
    }

    #region GET /api/brands

    [Fact]
    public async Task GetBrands_AsAdmin_ShouldReturnPaginatedList()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/brands");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<BrandListDto>>();
        result.Should().NotBeNull();
        result!.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task GetBrands_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/brands");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetBrands_WithPagination_ShouldRespectParameters()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/brands?pageNumber=1&pageSize=5");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<BrandListDto>>();
        result.Should().NotBeNull();
        result!.Items.Count.Should().BeLessThanOrEqualTo(5);
    }

    #endregion

    #region GET /api/brands/{id}

    [Fact]
    public async Task GetBrandById_ValidId_ShouldReturnBrand()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // First create a brand
        var createRequest = CreateTestBrandRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/brands", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdBrand = await createResponse.Content.ReadFromJsonAsync<BrandDto>();

        // Act
        var response = await adminClient.GetAsync($"/api/brands/{createdBrand!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var brand = await response.Content.ReadFromJsonAsync<BrandDto>();
        brand.Should().NotBeNull();
        brand!.Id.Should().Be(createdBrand.Id);
        brand.Name.Should().Be(createRequest.Name);
    }

    [Fact]
    public async Task GetBrandById_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync($"/api/brands/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region POST /api/brands

    [Fact]
    public async Task CreateBrand_ValidRequest_ShouldReturnCreatedBrand()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var request = CreateTestBrandRequest();

        // Act
        var response = await adminClient.PostAsJsonAsync("/api/brands", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var brand = await response.Content.ReadFromJsonAsync<BrandDto>();
        brand.Should().NotBeNull();
        brand!.Name.Should().Be(request.Name);
        brand.Slug.Should().Be(request.Slug);
    }

    [Fact]
    public async Task CreateBrand_EmptyName_ShouldReturnBadRequest()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var request = new CreateBrandRequest(
            Name: "",
            Slug: "test-slug",
            LogoUrl: null,
            BannerUrl: null,
            Description: null,
            Website: null,
            MetaTitle: null,
            MetaDescription: null);

        // Act
        var response = await adminClient.PostAsJsonAsync("/api/brands", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateBrand_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = CreateTestBrandRequest();

        // Act
        var response = await _client.PostAsJsonAsync("/api/brands", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateBrand_DuplicateSlug_ShouldReturnConflict()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var request = CreateTestBrandRequest();

        // Create the first brand
        var firstResponse = await adminClient.PostAsJsonAsync("/api/brands", request);
        firstResponse.EnsureSuccessStatusCode();

        // Act - Try to create with same slug
        var response = await adminClient.PostAsJsonAsync("/api/brands", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    #endregion

    #region PUT /api/brands/{id}

    [Fact]
    public async Task UpdateBrand_ValidRequest_ShouldReturnUpdatedBrand()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // First create a brand
        var createRequest = CreateTestBrandRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/brands", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdBrand = await createResponse.Content.ReadFromJsonAsync<BrandDto>();

        var updateRequest = new UpdateBrandRequest(
            Name: "Updated Brand Name",
            Slug: createRequest.Slug,
            LogoUrl: null,
            BannerUrl: null,
            Description: "Updated description",
            Website: null,
            MetaTitle: null,
            MetaDescription: null,
            IsActive: true,
            IsFeatured: false);

        // Act
        var response = await adminClient.PutAsJsonAsync($"/api/brands/{createdBrand!.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedBrand = await response.Content.ReadFromJsonAsync<BrandDto>();
        updatedBrand.Should().NotBeNull();
        updatedBrand!.Name.Should().Be("Updated Brand Name");
        updatedBrand.Description.Should().Be("Updated description");
    }

    [Fact]
    public async Task UpdateBrand_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var updateRequest = new UpdateBrandRequest(
            Name: "Updated Brand",
            Slug: "updated-brand",
            LogoUrl: null,
            BannerUrl: null,
            Description: null,
            Website: null,
            MetaTitle: null,
            MetaDescription: null,
            IsActive: true,
            IsFeatured: false);

        // Act
        var response = await adminClient.PutAsJsonAsync($"/api/brands/{Guid.NewGuid()}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region DELETE /api/brands/{id}

    [Fact]
    public async Task DeleteBrand_ValidId_ShouldReturnSuccess()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // First create a brand
        var request = CreateTestBrandRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/brands", request);
        createResponse.EnsureSuccessStatusCode();
        var createdBrand = await createResponse.Content.ReadFromJsonAsync<BrandDto>();

        // Act
        var response = await adminClient.DeleteAsync($"/api/brands/{createdBrand!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify it's deleted (soft delete - should return not found)
        var getResponse = await adminClient.GetAsync($"/api/brands/{createdBrand.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteBrand_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.DeleteAsync($"/api/brands/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Helper Methods

    private static CreateBrandRequest CreateTestBrandRequest()
    {
        var uniqueId = Guid.NewGuid().ToString("N")[..8];
        return new CreateBrandRequest(
            Name: $"Test Brand {uniqueId}",
            Slug: $"test-brand-{uniqueId}",
            LogoUrl: null,
            BannerUrl: null,
            Description: "Integration test brand",
            Website: null,
            MetaTitle: null,
            MetaDescription: null);
    }

    #endregion
}
