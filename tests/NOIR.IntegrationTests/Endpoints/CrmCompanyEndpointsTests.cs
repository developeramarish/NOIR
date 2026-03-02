using NOIR.Application.Features.Crm.DTOs;

namespace NOIR.IntegrationTests.Endpoints;

/// <summary>
/// Integration tests for CRM company management endpoints.
/// Tests the full HTTP request/response cycle with real middleware and handlers.
/// </summary>
[Collection("Integration")]
public class CrmCompanyEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CrmCompanyEndpointsTests(CustomWebApplicationFactory factory)
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

    #region GET /api/crm/companies

    [Fact]
    public async Task GetCompanies_AsAdmin_ShouldReturnPaginatedList()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/crm/companies");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<CompanyListDto>>();
        result.Should().NotBeNull();
        result!.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task GetCompanies_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/crm/companies");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCompanies_WithPagination_ShouldRespectParameters()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/crm/companies?page=1&pageSize=5");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<CompanyListDto>>();
        result.Should().NotBeNull();
        result!.Items.Count.Should().BeLessThanOrEqualTo(5);
    }

    #endregion

    #region GET /api/crm/companies/{id}

    [Fact]
    public async Task GetCompanyById_ValidId_ShouldReturnCompany()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var createRequest = CreateTestCompanyRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/crm/companies", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdCompany = await createResponse.Content.ReadFromJsonAsync<CompanyDto>();

        // Act
        var response = await adminClient.GetAsync($"/api/crm/companies/{createdCompany!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var company = await response.Content.ReadFromJsonAsync<CompanyDto>();
        company.Should().NotBeNull();
        company!.Id.Should().Be(createdCompany.Id);
        company.Name.Should().Be(createRequest.Name);
    }

    [Fact]
    public async Task GetCompanyById_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync($"/api/crm/companies/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region POST /api/crm/companies

    [Fact]
    public async Task CreateCompany_ValidRequest_ShouldReturnCreatedCompany()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var request = CreateTestCompanyRequest();

        // Act
        var response = await adminClient.PostAsJsonAsync("/api/crm/companies", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var company = await response.Content.ReadFromJsonAsync<CompanyDto>();
        company.Should().NotBeNull();
        company!.Name.Should().Be(request.Name);
    }

    [Fact]
    public async Task CreateCompany_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = CreateTestCompanyRequest();

        // Act
        var response = await _client.PostAsJsonAsync("/api/crm/companies", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region PUT /api/crm/companies/{id}

    [Fact]
    public async Task UpdateCompany_ValidRequest_ShouldReturnUpdatedCompany()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var createRequest = CreateTestCompanyRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/crm/companies", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdCompany = await createResponse.Content.ReadFromJsonAsync<CompanyDto>();

        var updateRequest = new UpdateCompanyRequest(
            Name: "Updated Company Name",
            Domain: "updated.com",
            Industry: "Technology",
            Phone: "+1234567890",
            EmployeeCount: 100);

        // Act
        var response = await adminClient.PutAsJsonAsync($"/api/crm/companies/{createdCompany!.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedCompany = await response.Content.ReadFromJsonAsync<CompanyDto>();
        updatedCompany.Should().NotBeNull();
        updatedCompany!.Name.Should().Be("Updated Company Name");
        updatedCompany.Domain.Should().Be("updated.com");
        updatedCompany.Industry.Should().Be("Technology");
    }

    [Fact]
    public async Task UpdateCompany_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var updateRequest = new UpdateCompanyRequest(Name: "Test Company");

        // Act
        var response = await adminClient.PutAsJsonAsync($"/api/crm/companies/{Guid.NewGuid()}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region DELETE /api/crm/companies/{id}

    [Fact]
    public async Task DeleteCompany_ValidId_ShouldReturnSuccess()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var request = CreateTestCompanyRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/crm/companies", request);
        createResponse.EnsureSuccessStatusCode();
        var createdCompany = await createResponse.Content.ReadFromJsonAsync<CompanyDto>();

        // Act
        var response = await adminClient.DeleteAsync($"/api/crm/companies/{createdCompany!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify it's deleted (soft delete - should return not found)
        var getResponse = await adminClient.GetAsync($"/api/crm/companies/{createdCompany.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteCompany_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.DeleteAsync($"/api/crm/companies/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Full CRUD Cycle

    [Fact]
    public async Task Company_FullCrudCycle_ShouldSucceed()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Create
        var createRequest = CreateTestCompanyRequest();
        var createResponse = await adminClient.PostAsJsonAsync("/api/crm/companies", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await createResponse.Content.ReadFromJsonAsync<CompanyDto>();
        created.Should().NotBeNull();
        var companyId = created!.Id;

        // Read
        var getResponse = await adminClient.GetAsync($"/api/crm/companies/{companyId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<CompanyDto>();
        fetched!.Name.Should().Be(createRequest.Name);

        // Update
        var updateRequest = new UpdateCompanyRequest(
            Name: "CrudUpdated Company",
            Industry: "Finance",
            Notes: "Updated via CRUD test");
        var updateResponse = await adminClient.PutAsJsonAsync($"/api/crm/companies/{companyId}", updateRequest);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<CompanyDto>();
        updated!.Name.Should().Be("CrudUpdated Company");
        updated.Industry.Should().Be("Finance");

        // Delete
        var deleteResponse = await adminClient.DeleteAsync($"/api/crm/companies/{companyId}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify deleted
        var verifyResponse = await adminClient.GetAsync($"/api/crm/companies/{companyId}");
        verifyResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Helper Methods

    private static CreateCompanyRequest CreateTestCompanyRequest()
    {
        var uniqueId = Guid.NewGuid().ToString("N");
        return new CreateCompanyRequest(
            Name: $"Test Company {uniqueId[..8]}",
            Domain: $"test-{uniqueId[..8]}.com",
            Industry: "Software");
    }

    #endregion
}
