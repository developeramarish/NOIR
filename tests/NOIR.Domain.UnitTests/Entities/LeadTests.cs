using NOIR.Domain.Entities.Crm;

namespace NOIR.Domain.UnitTests.Entities;

/// <summary>
/// Unit tests for the Lead entity.
/// Tests factory methods, stage movement, and win/lose/reopen lifecycle.
/// </summary>
public class LeadTests
{
    private const string TestTenantId = "test-tenant";

    private static Lead CreateActiveLead() =>
        Lead.Create("Test Deal", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            TestTenantId, value: 10000m, currency: "USD");

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties_AndStatusActive()
    {
        // Arrange
        var title = "Enterprise Deal";
        var contactId = Guid.NewGuid();
        var pipelineId = Guid.NewGuid();
        var stageId = Guid.NewGuid();
        var companyId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();

        // Act
        var lead = Lead.Create(
            title, contactId, pipelineId, stageId, TestTenantId,
            companyId, 50000m, "EUR", ownerId, 1.5,
            DateTimeOffset.UtcNow.AddDays(30), "Big deal");

        // Assert
        lead.Should().NotBeNull();
        lead.Id.Should().NotBe(Guid.Empty);
        lead.Title.Should().Be("Enterprise Deal");
        lead.ContactId.Should().Be(contactId);
        lead.PipelineId.Should().Be(pipelineId);
        lead.StageId.Should().Be(stageId);
        lead.CompanyId.Should().Be(companyId);
        lead.Value.Should().Be(50000m);
        lead.Currency.Should().Be("EUR");
        lead.OwnerId.Should().Be(ownerId);
        lead.Status.Should().Be(LeadStatus.Active);
        lead.SortOrder.Should().Be(1.5);
        lead.ExpectedCloseDate.Should().NotBeNull();
        lead.Notes.Should().Be("Big deal");
        lead.TenantId.Should().Be(TestTenantId);
        lead.WonAt.Should().BeNull();
        lead.LostAt.Should().BeNull();
        lead.LostReason.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyTitle_ShouldThrow()
    {
        // Act & Assert
        var act = () => Lead.Create(
            "", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), TestTenantId);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithDefaults_ShouldUseDefaultValues()
    {
        // Act
        var lead = Lead.Create(
            "Simple Deal", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), TestTenantId);

        // Assert
        lead.Value.Should().Be(0m);
        lead.Currency.Should().Be("USD");
        lead.SortOrder.Should().Be(0);
        lead.CompanyId.Should().BeNull();
        lead.OwnerId.Should().BeNull();
        lead.ExpectedCloseDate.Should().BeNull();
        lead.Notes.Should().BeNull();
    }

    #endregion

    #region MoveToStage Tests

    [Fact]
    public void MoveToStage_ShouldUpdateStageAndSortOrder()
    {
        // Arrange
        var lead = CreateActiveLead();
        var newStageId = Guid.NewGuid();
        var newSortOrder = 2.5;

        // Act
        lead.MoveToStage(newStageId, newSortOrder);

        // Assert
        lead.StageId.Should().Be(newStageId);
        lead.SortOrder.Should().Be(2.5);
    }

    #endregion

    #region Win Tests

    [Fact]
    public void Win_ShouldSetStatusWon_AndWonAt()
    {
        // Arrange
        var lead = CreateActiveLead();
        var beforeWin = DateTimeOffset.UtcNow;

        // Act
        lead.Win();

        // Assert
        lead.Status.Should().Be(LeadStatus.Won);
        lead.WonAt.Should().NotBeNull();
        lead.WonAt.Should().BeOnOrAfter(beforeWin);
    }

    [Fact]
    public void Win_WhenNotActive_ShouldThrow()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Win(); // Now Won

        // Act & Assert
        var act = () => lead.Win();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only active leads can be won.");
    }

    [Fact]
    public void Win_WhenLost_ShouldThrow()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Lose("Not interested");

        // Act & Assert
        var act = () => lead.Win();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only active leads can be won.");
    }

    #endregion

    #region Lose Tests

    [Fact]
    public void Lose_ShouldSetStatusLost_AndLostReason()
    {
        // Arrange
        var lead = CreateActiveLead();
        var reason = "Budget constraints";
        var beforeLose = DateTimeOffset.UtcNow;

        // Act
        lead.Lose(reason);

        // Assert
        lead.Status.Should().Be(LeadStatus.Lost);
        lead.LostAt.Should().NotBeNull();
        lead.LostAt.Should().BeOnOrAfter(beforeLose);
        lead.LostReason.Should().Be("Budget constraints");
    }

    [Fact]
    public void Lose_WithNullReason_ShouldAllowNull()
    {
        // Arrange
        var lead = CreateActiveLead();

        // Act
        lead.Lose(null);

        // Assert
        lead.Status.Should().Be(LeadStatus.Lost);
        lead.LostReason.Should().BeNull();
    }

    [Fact]
    public void Lose_WhenNotActive_ShouldThrow()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Lose("Already lost");

        // Act & Assert
        var act = () => lead.Lose("Again");
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only active leads can be lost.");
    }

    [Fact]
    public void Lose_WhenWon_ShouldThrow()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Win();

        // Act & Assert
        var act = () => lead.Lose("Changed mind");
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Only active leads can be lost.");
    }

    #endregion

    #region Reopen Tests

    [Fact]
    public void Reopen_WhenWon_ShouldResetToActive()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Win();

        // Act
        lead.Reopen();

        // Assert
        lead.Status.Should().Be(LeadStatus.Active);
        lead.WonAt.Should().BeNull();
        lead.LostAt.Should().BeNull();
        lead.LostReason.Should().BeNull();
    }

    [Fact]
    public void Reopen_WhenLost_ShouldResetToActive()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Lose("Budget");

        // Act
        lead.Reopen();

        // Assert
        lead.Status.Should().Be(LeadStatus.Active);
        lead.WonAt.Should().BeNull();
        lead.LostAt.Should().BeNull();
        lead.LostReason.Should().BeNull();
    }

    [Fact]
    public void Reopen_WhenActive_ShouldThrow()
    {
        // Arrange
        var lead = CreateActiveLead();

        // Act & Assert
        var act = () => lead.Reopen();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Lead is already active.");
    }

    #endregion

    #region Domain Event Tests

    [Fact]
    public void Win_ShouldRaiseLeadWonEvent()
    {
        // Arrange
        var lead = CreateActiveLead();

        // Act
        lead.Win();

        // Assert
        lead.DomainEvents.Should().ContainSingle(e => e is Events.Crm.LeadWonEvent);
    }

    [Fact]
    public void Lose_ShouldRaiseLeadLostEvent()
    {
        // Arrange
        var lead = CreateActiveLead();

        // Act
        lead.Lose("Lost reason");

        // Assert
        lead.DomainEvents.Should().ContainSingle(e => e is Events.Crm.LeadLostEvent);
    }

    [Fact]
    public void Reopen_ShouldRaiseLeadReopenedEvent()
    {
        // Arrange
        var lead = CreateActiveLead();
        lead.Win();

        // Act
        lead.Reopen();

        // Assert
        lead.DomainEvents.Should().Contain(e => e is Events.Crm.LeadReopenedEvent);
    }

    #endregion
}
