const runTest = require('../reports_visibility_test.js');

jest.setTimeout(60000); // Selenium tests take time

test('Reports visibility Selenium test', async () => {
  await runTest();
});
