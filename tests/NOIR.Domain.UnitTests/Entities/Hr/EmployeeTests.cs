using NOIR.Domain.Entities.Hr;
using NOIR.Domain.Events.Hr;

namespace NOIR.Domain.UnitTests.Entities.Hr;

/// <summary>
/// Unit tests for the Employee aggregate root entity.
/// Tests factory method, basic info updates, department/manager changes,
/// user linking, deactivation, and reactivation.
/// </summary>
public class EmployeeTests
{
    private const string TestTenantId = "test-tenant";
    private const string TestEmployeeCode = "EMP-001";
    private const string TestFirstName = "John";
    private const string TestLastName = "Doe";
    private const string TestEmail = "john.doe@example.com";
    private const string TestPhone = "+84912345678";
    private const string TestPosition = "Software Engineer";
    private static readonly Guid TestDepartmentId = Guid.NewGuid();
    private static readonly DateTimeOffset TestJoinDate = new(2025, 1, 15, 0, 0, 0, TimeSpan.Zero);

    private static Employee CreateTestEmployee(
        string employeeCode = TestEmployeeCode,
        string firstName = TestFirstName,
        string lastName = TestLastName,
        string email = TestEmail,
        Guid? departmentId = null,
        DateTimeOffset? joinDate = null,
        EmploymentType employmentType = EmploymentType.FullTime,
        string? tenantId = TestTenantId,
        string? phone = TestPhone,
        string? position = TestPosition,
        Guid? managerId = null,
        string? userId = null,
        string? notes = null)
    {
        return Employee.Create(
            employeeCode,
            firstName,
            lastName,
            email,
            departmentId ?? TestDepartmentId,
            joinDate ?? TestJoinDate,
            employmentType,
            tenantId,
            phone,
            position,
            managerId,
            userId,
            notes);
    }

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties()
    {
        // Arrange
        var managerId = Guid.NewGuid();
        var userId = "user-123";

        // Act
        var employee = CreateTestEmployee(
            managerId: managerId,
            userId: userId,
            notes: "Test notes");

        // Assert
        employee.Should().NotBeNull();
        employee.Id.Should().NotBe(Guid.Empty);
        employee.EmployeeCode.Should().Be(TestEmployeeCode);
        employee.FirstName.Should().Be(TestFirstName);
        employee.LastName.Should().Be(TestLastName);
        employee.Email.Should().Be(TestEmail);
        employee.Phone.Should().Be(TestPhone);
        employee.DepartmentId.Should().Be(TestDepartmentId);
        employee.Position.Should().Be(TestPosition);
        employee.ManagerId.Should().Be(managerId);
        employee.UserId.Should().Be(userId);
        employee.JoinDate.Should().Be(TestJoinDate);
        employee.EmploymentType.Should().Be(EmploymentType.FullTime);
        employee.Status.Should().Be(EmployeeStatus.Active);
        employee.EndDate.Should().BeNull();
        employee.TenantId.Should().Be(TestTenantId);
        employee.Notes.Should().Be("Test notes");
        employee.FullName.Should().Be("John Doe");
    }

    [Fact]
    public void Create_ShouldAddEmployeeCreatedEvent()
    {
        // Act
        var employee = CreateTestEmployee();

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeCreatedEvent>();
        var createdEvent = (EmployeeCreatedEvent)employee.DomainEvents.First();
        createdEvent.EmployeeId.Should().Be(employee.Id);
    }

    [Fact]
    public void Create_ShouldThrowForNullFirstName()
    {
        // Act
        var act = () => CreateTestEmployee(firstName: null!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrowForEmptyFirstName()
    {
        // Act
        var act = () => CreateTestEmployee(firstName: "");

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrowForNullLastName()
    {
        // Act
        var act = () => CreateTestEmployee(lastName: null!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrowForNullEmail()
    {
        // Act
        var act = () => CreateTestEmployee(email: null!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrowForNullEmployeeCode()
    {
        // Act
        var act = () => CreateTestEmployee(employeeCode: null!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldTrimAndLowercaseEmail()
    {
        // Act
        var employee = CreateTestEmployee(email: "  JOHN@EXAMPLE.COM  ");

        // Assert
        employee.Email.Should().Be("john@example.com");
    }

    [Fact]
    public void Create_ShouldTrimFirstAndLastName()
    {
        // Act
        var employee = CreateTestEmployee(firstName: "  John  ", lastName: "  Doe  ");

        // Assert
        employee.FirstName.Should().Be("John");
        employee.LastName.Should().Be("Doe");
    }

    [Fact]
    public void Create_WithNullOptionalFields_ShouldAllowNulls()
    {
        // Act
        var employee = CreateTestEmployee(phone: null, position: null, managerId: null, userId: null, notes: null);

        // Assert
        employee.Phone.Should().BeNull();
        employee.Position.Should().BeNull();
        employee.ManagerId.Should().BeNull();
        employee.UserId.Should().BeNull();
        employee.Notes.Should().BeNull();
    }

    [Fact]
    public void Create_MultipleCalls_ShouldGenerateUniqueIds()
    {
        // Act
        var employee1 = CreateTestEmployee();
        var employee2 = CreateTestEmployee();

        // Assert
        employee1.Id.Should().NotBe(employee2.Id);
    }

    #endregion

    #region UpdateBasicInfo Tests

    [Fact]
    public void UpdateBasicInfo_ShouldUpdateProperties()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateBasicInfo(
            "Jane", "Smith", "jane@example.com",
            "+84987654321", "https://example.com/avatar.jpg",
            "Senior Engineer", EmploymentType.PartTime, "Updated notes");

        // Assert
        employee.FirstName.Should().Be("Jane");
        employee.LastName.Should().Be("Smith");
        employee.Email.Should().Be("jane@example.com");
        employee.Phone.Should().Be("+84987654321");
        employee.AvatarUrl.Should().Be("https://example.com/avatar.jpg");
        employee.Position.Should().Be("Senior Engineer");
        employee.EmploymentType.Should().Be(EmploymentType.PartTime);
        employee.Notes.Should().Be("Updated notes");
    }

    [Fact]
    public void UpdateBasicInfo_ShouldAddUpdatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateBasicInfo(
            "Jane", "Smith", "jane@example.com",
            null, null, null, EmploymentType.FullTime, null);

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeUpdatedEvent>();
    }

    #endregion

    #region UpdateDepartment Tests

    [Fact]
    public void UpdateDepartment_ShouldChangeDepartment()
    {
        // Arrange
        var employee = CreateTestEmployee();
        var newDepartmentId = Guid.NewGuid();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateDepartment(newDepartmentId);

        // Assert
        employee.DepartmentId.Should().Be(newDepartmentId);
    }

    [Fact]
    public void UpdateDepartment_ShouldAddDepartmentChangedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        var oldDepartmentId = employee.DepartmentId;
        var newDepartmentId = Guid.NewGuid();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateDepartment(newDepartmentId);

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        var evt = employee.DomainEvents.First().Should().BeOfType<EmployeeDepartmentChangedEvent>().Subject;
        evt.EmployeeId.Should().Be(employee.Id);
        evt.OldDepartmentId.Should().Be(oldDepartmentId);
        evt.NewDepartmentId.Should().Be(newDepartmentId);
    }

    [Fact]
    public void UpdateDepartment_WithSameDepartment_ShouldNotAddEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        var sameDepartmentId = employee.DepartmentId;
        employee.ClearDomainEvents();

        // Act
        employee.UpdateDepartment(sameDepartmentId);

        // Assert
        employee.DomainEvents.Should().BeEmpty();
    }

    #endregion

    #region UpdateManager Tests

    [Fact]
    public void UpdateManager_ShouldSetManagerId()
    {
        // Arrange
        var employee = CreateTestEmployee();
        var managerId = Guid.NewGuid();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateManager(managerId);

        // Assert
        employee.ManagerId.Should().Be(managerId);
    }

    [Fact]
    public void UpdateManager_WithNull_ShouldClearManagerId()
    {
        // Arrange
        var employee = CreateTestEmployee(managerId: Guid.NewGuid());
        employee.ClearDomainEvents();

        // Act
        employee.UpdateManager(null);

        // Assert
        employee.ManagerId.Should().BeNull();
    }

    [Fact]
    public void UpdateManager_ShouldAddUpdatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.UpdateManager(Guid.NewGuid());

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeUpdatedEvent>();
    }

    #endregion

    #region Deactivate Tests

    [Fact]
    public void Deactivate_WithResigned_ShouldSetStatusAndEndDate()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.Deactivate(EmployeeStatus.Resigned);

        // Assert
        employee.Status.Should().Be(EmployeeStatus.Resigned);
        employee.EndDate.Should().NotBeNull();
        employee.EndDate.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Deactivate_WithTerminated_ShouldSetStatusAndEndDate()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.Deactivate(EmployeeStatus.Terminated);

        // Assert
        employee.Status.Should().Be(EmployeeStatus.Terminated);
        employee.EndDate.Should().NotBeNull();
    }

    [Fact]
    public void Deactivate_ShouldAddDeactivatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.Deactivate(EmployeeStatus.Resigned);

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        var evt = employee.DomainEvents.First().Should().BeOfType<EmployeeDeactivatedEvent>().Subject;
        evt.EmployeeId.Should().Be(employee.Id);
        evt.NewStatus.Should().Be(EmployeeStatus.Resigned);
    }

    [Fact]
    public void Deactivate_WithActiveStatus_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.Deactivate(EmployeeStatus.Active);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Deactivation status must be Resigned or Terminated.");
    }

    [Fact]
    public void Deactivate_WithSuspendedStatus_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.Deactivate(EmployeeStatus.Suspended);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Deactivation status must be Resigned or Terminated.");
    }

    [Fact]
    public void Deactivate_AlreadyDeactivatedEmployee_ShouldStillSucceed()
    {
        // Arrange - Employee is already deactivated (Resigned)
        var employee = CreateTestEmployee();
        employee.Deactivate(EmployeeStatus.Resigned);
        var firstEndDate = employee.EndDate;
        employee.ClearDomainEvents();

        // Act - Deactivate again with Terminated (no domain guard against double deactivation)
        employee.Deactivate(EmployeeStatus.Terminated);

        // Assert - Status is updated, EndDate is refreshed
        employee.Status.Should().Be(EmployeeStatus.Terminated);
        employee.EndDate.Should().NotBeNull();
        employee.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<EmployeeDeactivatedEvent>();
    }

    #endregion

    #region Reactivate Tests

    [Fact]
    public void Reactivate_ShouldSetActiveAndClearEndDate()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.Deactivate(EmployeeStatus.Resigned);
        employee.ClearDomainEvents();

        // Act
        employee.Reactivate();

        // Assert
        employee.Status.Should().Be(EmployeeStatus.Active);
        employee.EndDate.Should().BeNull();
    }

    [Fact]
    public void Reactivate_ShouldAddUpdatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.Deactivate(EmployeeStatus.Resigned);
        employee.ClearDomainEvents();

        // Act
        employee.Reactivate();

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeUpdatedEvent>();
    }

    [Fact]
    public void Reactivate_AlreadyActiveEmployee_ShouldStillSucceed()
    {
        // Arrange - Employee is already active (no domain guard)
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.Reactivate();

        // Assert - Remains active, EndDate stays null
        employee.Status.Should().Be(EmployeeStatus.Active);
        employee.EndDate.Should().BeNull();
        employee.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<EmployeeUpdatedEvent>();
    }

    #endregion

    #region LinkToUser Tests

    [Fact]
    public void LinkToUser_ShouldSetUserId()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.LinkToUser("user-456");

        // Assert
        employee.UserId.Should().Be("user-456");
    }

    [Fact]
    public void LinkToUser_ShouldAddUpdatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee();
        employee.ClearDomainEvents();

        // Act
        employee.LinkToUser("user-456");

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeUpdatedEvent>();
    }

    [Fact]
    public void LinkToUser_WithNullUserId_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.LinkToUser(null!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void LinkToUser_WithEmptyUserId_ShouldThrow()
    {
        // Arrange
        var employee = CreateTestEmployee();

        // Act
        var act = () => employee.LinkToUser("");

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    #endregion

    #region UnlinkUser Tests

    [Fact]
    public void UnlinkUser_ShouldClearUserId()
    {
        // Arrange
        var employee = CreateTestEmployee(userId: "user-123");
        employee.ClearDomainEvents();

        // Act
        employee.UnlinkUser();

        // Assert
        employee.UserId.Should().BeNull();
    }

    [Fact]
    public void UnlinkUser_ShouldAddUpdatedEvent()
    {
        // Arrange
        var employee = CreateTestEmployee(userId: "user-123");
        employee.ClearDomainEvents();

        // Act
        employee.UnlinkUser();

        // Assert
        employee.DomainEvents.Should().ContainSingle();
        employee.DomainEvents.First().Should().BeOfType<EmployeeUpdatedEvent>();
    }

    #endregion
}
