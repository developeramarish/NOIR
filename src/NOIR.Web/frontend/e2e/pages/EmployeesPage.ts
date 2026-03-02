import { type Page, type Locator, expect } from '@playwright/test';

export class EmployeesPage {
  readonly createButton: Locator;
  readonly employeeTable: Locator;
  readonly searchInput: Locator;
  readonly employeeRows: Locator;

  constructor(private page: Page) {
    this.createButton = page.getByRole('button', { name: /create|add|new/i }).first();
    this.employeeTable = page.getByRole('table');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.employeeRows = page.getByRole('table').getByRole('row');
  }

  async goto() {
    await this.page.goto('/portal/hr/employees');
    await this.page.waitForLoadState('networkidle');
  }

  async createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string;
  }) {
    await this.createButton.click();
    await this.page.getByLabel(/first name/i).fill(data.firstName);
    await this.page.getByLabel(/last name/i).fill(data.lastName);
    await this.page.getByLabel(/email/i).fill(data.email);
    if (data.departmentId) {
      await this.page.getByRole('combobox', { name: /department/i }).click();
      await this.page.getByRole('option').filter({ hasText: new RegExp(data.departmentId, 'i') }).click();
    }
    await this.page.getByRole('button', { name: /save|create|submit/i }).click();
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/hr/employees') && resp.request().method() === 'POST',
    );
  }

  async searchEmployee(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/hr/employees') && resp.status() === 200,
    );
  }

  async expectEmployeeInList(name: string) {
    await expect(this.page.getByRole('row', { name: new RegExp(name, 'i') })).toBeVisible();
  }
}
