using NOIR.Domain.Entities.Crm;

namespace NOIR.Domain.UnitTests.Entities;

/// <summary>
/// Unit tests for the CrmContact entity.
/// Tests factory methods, update, and customer linking.
/// </summary>
public class CrmContactTests
{
    private const string TestTenantId = "test-tenant";

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties()
    {
        // Arrange
        var firstName = "John";
        var lastName = "Doe";
        var email = "John.Doe@Example.COM";
        var source = ContactSource.Web;
        var phone = "555-0100";
        var jobTitle = "CTO";
        var companyId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var notes = "Important contact";

        // Act
        var contact = CrmContact.Create(
            firstName, lastName, email, source, TestTenantId,
            phone, jobTitle, companyId, ownerId, notes: notes);

        // Assert
        contact.Should().NotBeNull();
        contact.Id.Should().NotBe(Guid.Empty);
        contact.FirstName.Should().Be("John");
        contact.LastName.Should().Be("Doe");
        contact.Email.Should().Be("john.doe@example.com"); // lowercased
        contact.Source.Should().Be(ContactSource.Web);
        contact.Phone.Should().Be("555-0100");
        contact.JobTitle.Should().Be("CTO");
        contact.CompanyId.Should().Be(companyId);
        contact.OwnerId.Should().Be(ownerId);
        contact.Notes.Should().Be("Important contact");
        contact.TenantId.Should().Be(TestTenantId);
        contact.CustomerId.Should().BeNull();
        contact.FullName.Should().Be("John Doe");
    }

    [Fact]
    public void Create_ShouldTrimWhitespace()
    {
        // Act
        var contact = CrmContact.Create(
            " John ", " Doe ", " john@example.com ",
            ContactSource.Cold, TestTenantId,
            phone: " 555-0100 ", jobTitle: " CTO ", notes: " Note ");

        // Assert
        contact.FirstName.Should().Be("John");
        contact.LastName.Should().Be("Doe");
        contact.Email.Should().Be("john@example.com");
        contact.Phone.Should().Be("555-0100");
        contact.JobTitle.Should().Be("CTO");
        contact.Notes.Should().Be("Note");
    }

    [Fact]
    public void Create_WithNullOptionals_ShouldAllowNulls()
    {
        // Act
        var contact = CrmContact.Create(
            "John", "Doe", "john@example.com",
            ContactSource.Other, TestTenantId);

        // Assert
        contact.Phone.Should().BeNull();
        contact.JobTitle.Should().BeNull();
        contact.CompanyId.Should().BeNull();
        contact.OwnerId.Should().BeNull();
        contact.CustomerId.Should().BeNull();
        contact.Notes.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyFirstName_ShouldThrow()
    {
        // Act & Assert
        var act = () => CrmContact.Create(
            "", "Doe", "john@example.com",
            ContactSource.Web, TestTenantId);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithEmptyLastName_ShouldThrow()
    {
        // Act & Assert
        var act = () => CrmContact.Create(
            "John", "", "john@example.com",
            ContactSource.Web, TestTenantId);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithEmptyEmail_ShouldThrow()
    {
        // Act & Assert
        var act = () => CrmContact.Create(
            "John", "Doe", "",
            ContactSource.Web, TestTenantId);

        act.Should().Throw<ArgumentException>();
    }

    #endregion

    #region Update Tests

    [Fact]
    public void Update_ShouldModifyProperties()
    {
        // Arrange
        var contact = CrmContact.Create(
            "John", "Doe", "john@example.com",
            ContactSource.Web, TestTenantId);

        var newCompanyId = Guid.NewGuid();
        var newOwnerId = Guid.NewGuid();
        var newCustomerId = Guid.NewGuid();

        // Act
        contact.Update(
            "Jane", "Smith", "Jane.Smith@Example.COM",
            ContactSource.Referral, "555-0200", "CEO",
            newCompanyId, newOwnerId, newCustomerId, "Updated notes");

        // Assert
        contact.FirstName.Should().Be("Jane");
        contact.LastName.Should().Be("Smith");
        contact.Email.Should().Be("jane.smith@example.com");
        contact.Source.Should().Be(ContactSource.Referral);
        contact.Phone.Should().Be("555-0200");
        contact.JobTitle.Should().Be("CEO");
        contact.CompanyId.Should().Be(newCompanyId);
        contact.OwnerId.Should().Be(newOwnerId);
        contact.CustomerId.Should().Be(newCustomerId);
        contact.Notes.Should().Be("Updated notes");
    }

    #endregion

    #region SetCustomerId Tests

    [Fact]
    public void Update_WithCustomerId_ShouldLinkToCustomer()
    {
        // Arrange
        var contact = CrmContact.Create(
            "John", "Doe", "john@example.com",
            ContactSource.Web, TestTenantId);
        var customerId = Guid.NewGuid();

        // Act
        contact.Update(
            contact.FirstName, contact.LastName, contact.Email,
            contact.Source, contact.Phone, contact.JobTitle,
            contact.CompanyId, contact.OwnerId, customerId, contact.Notes);

        // Assert
        contact.CustomerId.Should().Be(customerId);
    }

    #endregion

    #region FullName Tests

    [Fact]
    public void FullName_ShouldReturnFirstNameAndLastName()
    {
        // Arrange
        var contact = CrmContact.Create(
            "John", "Doe", "john@example.com",
            ContactSource.Web, TestTenantId);

        // Assert
        contact.FullName.Should().Be("John Doe");
    }

    #endregion
}
