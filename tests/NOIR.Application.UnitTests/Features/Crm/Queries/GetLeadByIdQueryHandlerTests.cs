using NOIR.Application.Features.Crm.Queries.GetLeadById;
using NOIR.Domain.Entities.Crm;

namespace NOIR.Application.UnitTests.Features.Crm.Queries;

public class GetLeadByIdQueryHandlerTests
{
    private readonly Mock<IRepository<Lead, Guid>> _leadRepoMock;
    private readonly GetLeadByIdQueryHandler _handler;

    private const string TestTenantId = "tenant-123";

    public GetLeadByIdQueryHandlerTests()
    {
        _leadRepoMock = new Mock<IRepository<Lead, Guid>>();
        _handler = new GetLeadByIdQueryHandler(_leadRepoMock.Object);
    }

    [Fact]
    public async Task Handle_ExistingLead_ShouldReturnDto()
    {
        // Arrange
        var lead = Lead.Create(
            "Enterprise Deal", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            TestTenantId, value: 50000, currency: "USD",
            notes: "Important client");

        _leadRepoMock
            .Setup(x => x.FirstOrDefaultAsync(It.IsAny<LeadByIdReadOnlySpec>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(lead);

        var query = new GetLeadByIdQuery(lead.Id);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(lead.Id);
        result.Value.Title.Should().Be("Enterprise Deal");
        result.Value.Value.Should().Be(50000);
        result.Value.Currency.Should().Be("USD");
        result.Value.Status.Should().Be(LeadStatus.Active);
    }

    [Fact]
    public async Task Handle_NonExistentLead_ShouldReturnNotFound()
    {
        // Arrange
        _leadRepoMock
            .Setup(x => x.FirstOrDefaultAsync(It.IsAny<LeadByIdReadOnlySpec>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Lead?)null);

        var query = new GetLeadByIdQuery(Guid.NewGuid());

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }
}
