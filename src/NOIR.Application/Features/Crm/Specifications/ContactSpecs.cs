namespace NOIR.Application.Features.Crm.Specifications;

/// <summary>
/// Get contact by ID with tracking for mutations.
/// </summary>
public sealed class ContactByIdSpec : Specification<CrmContact>
{
    public ContactByIdSpec(Guid id)
    {
        Query.Where(c => c.Id == id)
             .Include(c => c.Company!)
             .Include(c => c.Owner!)
             .Include(c => c.Customer!)
             .Include(c => c.Leads)
             .AsTracking()
             .TagWith("ContactById");
    }
}

/// <summary>
/// Get contact by ID read-only (for queries).
/// </summary>
public sealed class ContactByIdReadOnlySpec : Specification<CrmContact>
{
    public ContactByIdReadOnlySpec(Guid id)
    {
        Query.Where(c => c.Id == id)
             .Include(c => c.Company!)
             .Include(c => c.Owner!)
             .Include(c => c.Customer!)
             .Include(c => c.Leads)
             .TagWith("ContactByIdReadOnly");
    }
}

/// <summary>
/// Find contact by email for uniqueness check.
/// </summary>
public sealed class ContactByEmailSpec : Specification<CrmContact>
{
    public ContactByEmailSpec(string email, Guid? excludeId = null)
    {
        Query.Where(c => c.Email == email.ToLowerInvariant())
             .Where(c => excludeId == null || c.Id != excludeId)
             .TagWith("ContactByEmail");
    }
}

/// <summary>
/// Paginated, filterable contact list.
/// </summary>
public sealed class ContactsFilterSpec : Specification<CrmContact>
{
    public ContactsFilterSpec(
        string? search = null,
        Guid? companyId = null,
        Guid? ownerId = null,
        ContactSource? source = null,
        int? skip = null,
        int? take = null)
    {
        if (!string.IsNullOrEmpty(search))
        {
            Query.Where(c =>
                c.FirstName.Contains(search) ||
                c.LastName.Contains(search) ||
                c.Email.Contains(search));
        }

        if (companyId.HasValue)
            Query.Where(c => c.CompanyId == companyId.Value);

        if (ownerId.HasValue)
            Query.Where(c => c.OwnerId == ownerId.Value);

        if (source.HasValue)
            Query.Where(c => c.Source == source.Value);

        Query.Include(c => c.Company!)
             .Include(c => c.Owner!)
             .OrderByDescending(c => c.CreatedAt);

        if (skip.HasValue) Query.Skip(skip.Value);
        if (take.HasValue) Query.Take(take.Value);

        Query.TagWith("ContactsFilter");
    }
}

/// <summary>
/// Count contacts matching filters (without pagination).
/// </summary>
public sealed class ContactsCountSpec : Specification<CrmContact>
{
    public ContactsCountSpec(
        string? search = null,
        Guid? companyId = null,
        Guid? ownerId = null,
        ContactSource? source = null)
    {
        if (!string.IsNullOrEmpty(search))
        {
            Query.Where(c =>
                c.FirstName.Contains(search) ||
                c.LastName.Contains(search) ||
                c.Email.Contains(search));
        }

        if (companyId.HasValue)
            Query.Where(c => c.CompanyId == companyId.Value);

        if (ownerId.HasValue)
            Query.Where(c => c.OwnerId == ownerId.Value);

        if (source.HasValue)
            Query.Where(c => c.Source == source.Value);

        Query.TagWith("ContactsCount");
    }
}

/// <summary>
/// Check if a contact has active leads (for delete validation).
/// </summary>
public sealed class ContactHasActiveLeadsSpec : Specification<Lead>
{
    public ContactHasActiveLeadsSpec(Guid contactId)
    {
        Query.Where(l => l.ContactId == contactId && l.Status == LeadStatus.Active)
             .TagWith("ContactHasActiveLeads");
    }
}
