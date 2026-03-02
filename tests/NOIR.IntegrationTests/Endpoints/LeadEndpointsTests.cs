using NOIR.Application.Features.Crm.DTOs;
using NOIR.Application.Features.Customers.DTOs;
using NOIR.Domain.Enums;

namespace NOIR.IntegrationTests.Endpoints;

/// <summary>
/// Integration tests for CRM lead management endpoints.
/// Tests the full HTTP request/response cycle with real middleware and handlers.
/// </summary>
[Collection("Integration")]
public class LeadEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LeadEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateTestClient();
    }

    private async Task<HttpClient> GetAdminClientAsync()
    {
        var loginCommand = new LoginCommand("admin@noir.local", "123qwe");
        var response = await _client.PostAsJsonWithEnumsAsync("/api/auth/login", loginCommand);
        var loginResponse = await response.Content.ReadFromJsonWithEnumsAsync<LoginResponse>();
        return _factory.CreateAuthenticatedClient(loginResponse!.Auth!.AccessToken);
    }

    private async Task<ContactDto> CreateTestContactAsync(HttpClient adminClient)
    {
        var uniqueId = Guid.NewGuid().ToString("N");
        var request = new CreateContactRequest(
            FirstName: $"Lead-{uniqueId[..6]}",
            LastName: $"Test-{uniqueId[6..12]}",
            Email: $"lead-{uniqueId}@test.com",
            Source: ContactSource.Web);
        var response = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/contacts", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonWithEnumsAsync<ContactDto>())!;
    }

    private async Task<PipelineDto> GetOrCreatePipelineAsync(HttpClient adminClient)
    {
        // Try to get existing pipelines first
        var listResponse = await adminClient.GetAsync("/api/crm/pipelines");
        listResponse.EnsureSuccessStatusCode();
        var pipelines = await listResponse.Content.ReadFromJsonWithEnumsAsync<List<PipelineDto>>();
        if (pipelines != null && pipelines.Count > 0)
            return pipelines[0];

        // Create a pipeline if none exist
        var request = new CreatePipelineRequest(
            Name: $"Test Pipeline {Guid.NewGuid():N}",
            IsDefault: false,
            Stages: new List<CreatePipelineStageDto>
            {
                new("Prospect", 1, "#6366f1"),
                new("Qualified", 2, "#8b5cf6"),
                new("Proposal", 3, "#a855f7")
            });
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/pipelines", request);
        createResponse.EnsureSuccessStatusCode();
        return (await createResponse.Content.ReadFromJsonWithEnumsAsync<PipelineDto>())!;
    }

    #region GET /api/crm/leads

    [Fact]
    public async Task GetLeads_AsAdmin_ShouldReturnPaginatedList()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/crm/leads");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonWithEnumsAsync<PagedResult<LeadDto>>();
        result.Should().NotBeNull();
        result!.Items.Should().NotBeNull();
    }

    [Fact]
    public async Task GetLeads_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/crm/leads");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetLeads_WithPagination_ShouldRespectParameters()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/crm/leads?page=1&pageSize=5");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonWithEnumsAsync<PagedResult<LeadDto>>();
        result.Should().NotBeNull();
        result!.Items.Count.Should().BeLessThanOrEqualTo(5);
    }

    #endregion

    #region GET /api/crm/leads/{id}

    [Fact]
    public async Task GetLeadById_ValidId_ShouldReturnLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Act
        var response = await adminClient.GetAsync($"/api/crm/leads/{createdLead!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        lead.Should().NotBeNull();
        lead!.Id.Should().Be(createdLead.Id);
        lead.Title.Should().Be(createRequest.Title);
        lead.ContactId.Should().Be(contact.Id);
    }

    [Fact]
    public async Task GetLeadById_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync($"/api/crm/leads/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region POST /api/crm/leads

    [Fact]
    public async Task CreateLead_ValidRequest_ShouldReturnCreatedLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var request = CreateTestLeadRequest(contact.Id, pipeline.Id);

        // Act
        var response = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        lead.Should().NotBeNull();
        lead!.Title.Should().Be(request.Title);
        lead.ContactId.Should().Be(contact.Id);
        lead.PipelineId.Should().Be(pipeline.Id);
        lead.Status.Should().Be(LeadStatus.Active);
    }

    [Fact]
    public async Task CreateLead_Unauthenticated_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = CreateTestLeadRequest(Guid.NewGuid(), Guid.NewGuid());

        // Act
        var response = await _client.PostAsJsonWithEnumsAsync("/api/crm/leads", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region PUT /api/crm/leads/{id}

    [Fact]
    public async Task UpdateLead_ValidRequest_ShouldReturnUpdatedLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        var updateRequest = new UpdateLeadRequest(
            Title: "Updated Lead Title",
            ContactId: contact.Id,
            Value: 50000,
            Currency: "EUR",
            Notes: "Updated via integration test");

        // Act
        var response = await adminClient.PutAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead!.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedLead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        updatedLead.Should().NotBeNull();
        updatedLead!.Title.Should().Be("Updated Lead Title");
        updatedLead.Value.Should().Be(50000);
        updatedLead.Currency.Should().Be("EUR");
    }

    [Fact]
    public async Task UpdateLead_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var updateRequest = new UpdateLeadRequest(
            Title: "Test",
            ContactId: Guid.NewGuid());

        // Act
        var response = await adminClient.PutAsJsonWithEnumsAsync($"/api/crm/leads/{Guid.NewGuid()}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Lead Lifecycle (Win/Lose/Reopen)

    [Fact]
    public async Task WinLead_ActiveLead_ShouldReturnWonLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Act
        var response = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/win", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var wonLead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        wonLead.Should().NotBeNull();
        wonLead!.Status.Should().Be(LeadStatus.Won);
        wonLead.WonAt.Should().NotBeNull();
    }

    [Fact]
    public async Task WinLead_InvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();

        // Act
        var response = await adminClient.PostAsync($"/api/crm/leads/{Guid.NewGuid()}/win", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LoseLead_ActiveLead_ShouldReturnLostLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        var loseRequest = new LoseLeadRequest("Budget constraints");

        // Act
        var response = await adminClient.PostAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead!.Id}/lose", loseRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lostLead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        lostLead.Should().NotBeNull();
        lostLead!.Status.Should().Be(LeadStatus.Lost);
        lostLead.LostAt.Should().NotBeNull();
        lostLead.LostReason.Should().Be("Budget constraints");
    }

    [Fact]
    public async Task ReopenLead_WonLead_ShouldReturnActiveLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Win the lead first
        var winResponse = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/win", null);
        winResponse.EnsureSuccessStatusCode();

        // Act - Reopen
        var response = await adminClient.PostAsync($"/api/crm/leads/{createdLead.Id}/reopen", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var reopenedLead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        reopenedLead.Should().NotBeNull();
        reopenedLead!.Status.Should().Be(LeadStatus.Active);
    }

    #endregion

    #region Move Stage

    [Fact]
    public async Task MoveLeadStage_ValidRequest_ShouldReturnUpdatedLead()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Get a different stage to move to
        var targetStage = pipeline.Stages.FirstOrDefault(s => s.Id != createdLead!.StageId);
        if (targetStage == null) return; // Skip if only one stage

        var moveRequest = new MoveLeadStageRequest(targetStage.Id, 1.0);

        // Act
        var response = await adminClient.PostAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead!.Id}/move-stage", moveRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var movedLead = await response.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        movedLead.Should().NotBeNull();
        movedLead!.StageId.Should().Be(targetStage.Id);
    }

    #endregion

    #region Full CRUD Cycle

    [Fact]
    public async Task Lead_FullCrudCycle_ShouldSucceed()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);

        // Create
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        created.Should().NotBeNull();
        var leadId = created!.Id;

        // Read
        var getResponse = await adminClient.GetAsync($"/api/crm/leads/{leadId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        fetched!.Title.Should().Be(createRequest.Title);

        // Update
        var updateRequest = new UpdateLeadRequest(
            Title: "CrudUpdated Lead",
            ContactId: contact.Id,
            Value: 75000,
            Currency: "GBP",
            Notes: "Updated via CRUD test");
        var updateResponse = await adminClient.PutAsJsonWithEnumsAsync($"/api/crm/leads/{leadId}", updateRequest);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        updated!.Title.Should().Be("CrudUpdated Lead");
        updated.Value.Should().Be(75000);

        // Win
        var winResponse = await adminClient.PostAsync($"/api/crm/leads/{leadId}/win", null);
        winResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var won = await winResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        won!.Status.Should().Be(LeadStatus.Won);

        // Reopen
        var reopenResponse = await adminClient.PostAsync($"/api/crm/leads/{leadId}/reopen", null);
        reopenResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reopened = await reopenResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();
        reopened!.Status.Should().Be(LeadStatus.Active);
    }

    #endregion

    #region Lead State Machine Violations

    [Fact]
    public async Task WinLead_AlreadyWonLead_ShouldReturnBadRequest()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Win the lead first
        var winResponse = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/win", null);
        winResponse.EnsureSuccessStatusCode();

        // Act - try to win it again
        var response = await adminClient.PostAsync($"/api/crm/leads/{createdLead.Id}/win", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LoseLead_AlreadyLostLead_ShouldReturnBadRequest()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Lose the lead first
        var loseRequest = new LoseLeadRequest("No budget");
        var loseResponse = await adminClient.PostAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead!.Id}/lose", loseRequest);
        loseResponse.EnsureSuccessStatusCode();

        // Act - try to lose it again
        var loseAgainRequest = new LoseLeadRequest("Changed mind");
        var response = await adminClient.PostAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead.Id}/lose", loseAgainRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ReopenLead_ActiveLead_ShouldReturnBadRequest()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Act - try to reopen an already-active lead
        var response = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/reopen", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MoveLeadStage_WonLead_ShouldReturnBadRequest()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Win the lead
        var winResponse = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/win", null);
        winResponse.EnsureSuccessStatusCode();

        // Get a stage to move to
        var targetStage = pipeline.Stages.First(s => s.Id != createdLead.StageId);
        var moveRequest = new MoveLeadStageRequest(targetStage.Id, 1.0);

        // Act - try to move stage on a won lead
        var response = await adminClient.PostAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead.Id}/move-stage", moveRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region WinLead Customer Creation

    [Fact]
    public async Task WinLead_WithContact_ShouldCreateCustomer()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Act - win the lead (should auto-create customer from contact)
        var winResponse = await adminClient.PostAsync($"/api/crm/leads/{createdLead!.Id}/win", null);
        winResponse.EnsureSuccessStatusCode();

        // Assert - search customers by the contact's email
        var searchResponse = await adminClient.GetAsync($"/api/customers?search={contact.Email}");
        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var customers = await searchResponse.Content.ReadFromJsonWithEnumsAsync<PagedResult<CustomerSummaryDto>>();
        customers.Should().NotBeNull();
        customers!.Items.Should().ContainSingle(c => c.Email == contact.Email);
    }

    #endregion

    #region ReorderLead

    [Fact]
    public async Task ReorderLead_ValidRequest_ShouldSucceed()
    {
        // Arrange
        var adminClient = await GetAdminClientAsync();
        var contact = await CreateTestContactAsync(adminClient);
        var pipeline = await GetOrCreatePipelineAsync(adminClient);
        var createRequest = CreateTestLeadRequest(contact.Id, pipeline.Id);
        var createResponse = await adminClient.PostAsJsonWithEnumsAsync("/api/crm/leads", createRequest);
        createResponse.EnsureSuccessStatusCode();
        var createdLead = await createResponse.Content.ReadFromJsonWithEnumsAsync<LeadDto>();

        // Act - reorder the lead with a new sort order
        var response = await adminClient.PutAsJsonWithEnumsAsync($"/api/crm/leads/{createdLead!.Id}/reorder", 100.5);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    #endregion

    #region Helper Methods

    private static CreateLeadRequest CreateTestLeadRequest(Guid contactId, Guid pipelineId)
    {
        var uniqueId = Guid.NewGuid().ToString("N");
        return new CreateLeadRequest(
            Title: $"Test Deal {uniqueId[..8]}",
            ContactId: contactId,
            PipelineId: pipelineId,
            Value: 10000,
            Currency: "USD",
            Notes: "Integration test lead");
    }

    #endregion
}
