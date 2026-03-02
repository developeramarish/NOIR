import { test, expect } from '../fixtures/base.fixture';
import { testEmployee } from '../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

test('debug: verify employee creation with joinDate', async ({ api }) => {
  // Create dept
  const deptRes = await api.request.post(`${API_URL}/api/hr/departments`, {
    data: { name: 'Debug Dept 2', code: 'DBG-002' }
  });
  const deptText = await deptRes.text();
  const dept = deptText ? JSON.parse(deptText) : {};
  console.log('Created dept:', JSON.stringify(dept));

  // Create employee with deptId using helper
  const empData = testEmployee({ departmentId: dept.id });
  console.log('Employee data to send:', JSON.stringify(empData));
  const emp = await api.createEmployee(empData);
  console.log('Created emp status:', JSON.stringify(emp));

  // Try to delete dept via API
  const delRes = await api.request.delete(`${API_URL}/api/hr/departments/${dept.id}`);
  const delText = await delRes.text();
  console.log('Delete response status:', delRes.status());
  console.log('Delete response body:', delText.substring(0, 200));

  // Cleanup
  if (emp.id) await api.deleteEmployee(emp.id).catch(() => {});
  await api.request.delete(`${API_URL}/api/hr/departments/${dept.id}`).catch(() => {});

  expect(true).toBe(true);
});
