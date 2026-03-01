using NOIR.Domain.Entities.Crm;

namespace NOIR.Domain.UnitTests.Entities;

/// <summary>
/// Unit tests for the CrmCompany entity.
/// Tests factory methods and update.
/// </summary>
public class CrmCompanyTests
{
    private const string TestTenantId = "test-tenant";

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties()
    {
        // Arrange
        var ownerId = Guid.NewGuid();

        // Act
        var company = CrmCompany.Create(
            "Acme Corp", TestTenantId,
            domain: "Acme.com", industry: "Technology",
            address: "123 Main St", phone: "555-0100",
            website: "https://acme.com", ownerId: ownerId,
            taxId: "TAX-123", employeeCount: 500,
            notes: "Key account");

        // Assert
        company.Should().NotBeNull();
        company.Id.Should().NotBe(Guid.Empty);
        company.Name.Should().Be("Acme Corp");
        company.Domain.Should().Be("acme.com"); // lowercased
        company.Industry.Should().Be("Technology");
        company.Address.Should().Be("123 Main St");
        company.Phone.Should().Be("555-0100");
        company.Website.Should().Be("https://acme.com");
        company.OwnerId.Should().Be(ownerId);
        company.TaxId.Should().Be("TAX-123");
        company.EmployeeCount.Should().Be(500);
        company.Notes.Should().Be("Key account");
        company.TenantId.Should().Be(TestTenantId);
    }

    [Fact]
    public void Create_WithNullOptionals_ShouldAllowNulls()
    {
        // Act
        var company = CrmCompany.Create("Acme Corp", TestTenantId);

        // Assert
        company.Domain.Should().BeNull();
        company.Industry.Should().BeNull();
        company.Address.Should().BeNull();
        company.Phone.Should().BeNull();
        company.Website.Should().BeNull();
        company.OwnerId.Should().BeNull();
        company.TaxId.Should().BeNull();
        company.EmployeeCount.Should().BeNull();
        company.Notes.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyName_ShouldThrow()
    {
        // Act & Assert
        var act = () => CrmCompany.Create("", TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldTrimAndLowercaseDomain()
    {
        // Act
        var company = CrmCompany.Create(
            " Acme ", TestTenantId,
            domain: " ACME.COM ");

        // Assert
        company.Name.Should().Be("Acme");
        company.Domain.Should().Be("acme.com");
    }

    #endregion

    #region Update Tests

    [Fact]
    public void Update_ShouldModifyProperties()
    {
        // Arrange
        var company = CrmCompany.Create("Old Name", TestTenantId);
        var newOwnerId = Guid.NewGuid();

        // Act
        company.Update(
            "New Name", "newdomain.com", "Finance",
            "456 Elm St", "555-0200", "https://new.com",
            newOwnerId, "TAX-456", 1000, "Updated notes");

        // Assert
        company.Name.Should().Be("New Name");
        company.Domain.Should().Be("newdomain.com");
        company.Industry.Should().Be("Finance");
        company.Address.Should().Be("456 Elm St");
        company.Phone.Should().Be("555-0200");
        company.Website.Should().Be("https://new.com");
        company.OwnerId.Should().Be(newOwnerId);
        company.TaxId.Should().Be("TAX-456");
        company.EmployeeCount.Should().Be(1000);
        company.Notes.Should().Be("Updated notes");
    }

    [Fact]
    public void Update_WithNulls_ShouldClearOptionalFields()
    {
        // Arrange
        var company = CrmCompany.Create(
            "Acme", TestTenantId,
            domain: "acme.com", industry: "Tech",
            notes: "Some notes");

        // Act
        company.Update("Acme", null, null, null, null, null, null, null, null, null);

        // Assert
        company.Domain.Should().BeNull();
        company.Industry.Should().BeNull();
        company.Notes.Should().BeNull();
    }

    #endregion
}
