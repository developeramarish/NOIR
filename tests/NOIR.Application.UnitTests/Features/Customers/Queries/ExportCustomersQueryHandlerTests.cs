using NOIR.Application.Features.Customers.Queries.ExportCustomers;
using NOIR.Application.Features.Reports.DTOs;

namespace NOIR.Application.UnitTests.Features.Customers.Queries;

/// <summary>
/// Unit tests for ExportCustomersQueryHandler.
/// Tests CSV and Excel export with various filter scenarios.
/// </summary>
public class ExportCustomersQueryHandlerTests
{
    #region Test Setup

    private readonly Mock<IRepository<Customer, Guid>> _customerRepositoryMock;
    private readonly Mock<IExcelExportService> _excelExportServiceMock;
    private readonly Mock<ILogger<ExportCustomersQueryHandler>> _loggerMock;
    private readonly ExportCustomersQueryHandler _handler;

    public ExportCustomersQueryHandlerTests()
    {
        _customerRepositoryMock = new Mock<IRepository<Customer, Guid>>();
        _excelExportServiceMock = new Mock<IExcelExportService>();
        _loggerMock = new Mock<ILogger<ExportCustomersQueryHandler>>();

        _handler = new ExportCustomersQueryHandler(
            _customerRepositoryMock.Object,
            _excelExportServiceMock.Object,
            _loggerMock.Object);
    }

    private static Customer CreateTestCustomer(
        string email = "john@example.com",
        string firstName = "John",
        string lastName = "Doe",
        string? phone = "0901234567")
    {
        return Customer.Create(null, email, firstName, lastName, phone, "tenant-123");
    }

    private void SetupRepositoryToReturn(List<Customer> customers)
    {
        _customerRepositoryMock
            .Setup(x => x.ListAsync(
                It.IsAny<CustomersForExportSpec>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(customers);
    }

    #endregion

    #region CSV Format Tests

    [Fact]
    public async Task Handle_WithCsvFormat_ReturnsCsvFile()
    {
        // Arrange
        var customers = new List<Customer>
        {
            CreateTestCustomer("alice@test.com", "Alice", "Smith"),
            CreateTestCustomer("bob@test.com", "Bob", "Jones")
        };
        SetupRepositoryToReturn(customers);

        var query = new ExportCustomersQuery(Format: ExportFormat.CSV);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ContentType.Should().Be("text/csv");
        result.Value.FileName.Should().StartWith("customers-").And.EndWith(".csv");
        result.Value.FileBytes.Should().NotBeEmpty();

        var csvContent = Encoding.UTF8.GetString(result.Value.FileBytes);
        csvContent.Should().Contain("FirstName");
        csvContent.Should().Contain("LastName");
        csvContent.Should().Contain("Email");
        csvContent.Should().Contain("Alice");
        csvContent.Should().Contain("Bob");
    }

    #endregion

    #region Excel Format Tests

    [Fact]
    public async Task Handle_WithExcelFormat_ReturnsExcelFile()
    {
        // Arrange
        var customers = new List<Customer>
        {
            CreateTestCustomer("alice@test.com", "Alice", "Smith")
        };
        SetupRepositoryToReturn(customers);

        var excelBytes = new byte[] { 0x50, 0x4B, 0x03, 0x04 };
        _excelExportServiceMock
            .Setup(x => x.CreateExcelFile(
                "Customers",
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<IReadOnlyList<IReadOnlyList<object?>>>()))
            .Returns(excelBytes);

        var query = new ExportCustomersQuery(Format: ExportFormat.Excel);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.ContentType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        result.Value.FileName.Should().StartWith("customers-").And.EndWith(".xlsx");
        result.Value.FileBytes.Should().BeEquivalentTo(excelBytes);

        _excelExportServiceMock.Verify(
            x => x.CreateExcelFile("Customers", It.IsAny<IReadOnlyList<string>>(), It.IsAny<IReadOnlyList<IReadOnlyList<object?>>>()),
            Times.Once);
    }

    #endregion

    #region Filter Tests

    [Fact]
    public async Task Handle_WithSegmentFilter_FiltersCustomers()
    {
        // Arrange
        var customers = new List<Customer> { CreateTestCustomer() };
        SetupRepositoryToReturn(customers);

        var query = new ExportCustomersQuery(Segment: CustomerSegment.VIP);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();

        _customerRepositoryMock.Verify(
            x => x.ListAsync(It.IsAny<CustomersForExportSpec>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region Empty Data Tests

    [Fact]
    public async Task Handle_WithNoCustomers_ReturnsEmptyFile()
    {
        // Arrange
        SetupRepositoryToReturn(new List<Customer>());
        var query = new ExportCustomersQuery(Format: ExportFormat.CSV);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.FileBytes.Should().NotBeEmpty();

        // CSV should still have headers even with no data rows
        var csvContent = Encoding.UTF8.GetString(result.Value.FileBytes);
        csvContent.Should().Contain("FirstName");
        csvContent.Should().Contain("Email");
    }

    #endregion

    #region Column Verification Tests

    [Fact]
    public async Task Handle_IncludesAllExpectedColumns()
    {
        // Arrange
        var customers = new List<Customer> { CreateTestCustomer() };
        SetupRepositoryToReturn(customers);

        var query = new ExportCustomersQuery(Format: ExportFormat.CSV);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var csvContent = Encoding.UTF8.GetString(result.Value.FileBytes);
        var headerLine = csvContent.Split('\n')[0];

        headerLine.Should().Contain("FirstName");
        headerLine.Should().Contain("LastName");
        headerLine.Should().Contain("Email");
        headerLine.Should().Contain("Phone");
        headerLine.Should().Contain("Segment");
        headerLine.Should().Contain("Tier");
        headerLine.Should().Contain("TotalOrders");
        headerLine.Should().Contain("TotalSpent");
        headerLine.Should().Contain("AverageOrderValue");
        headerLine.Should().Contain("LoyaltyPoints");
        headerLine.Should().Contain("IsActive");
        headerLine.Should().Contain("Tags");
        headerLine.Should().Contain("CreatedAt");
    }

    #endregion
}
