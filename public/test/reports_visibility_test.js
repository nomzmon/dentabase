const { Builder, By, until } = require('selenium-webdriver');
require('chromedriver');

async function runTest() {
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    //open local site
    await driver.get('http://localhost:3000');

    //log in
    await driver.wait(until.elementLocated(By.id('password')), 5000);
    await driver.findElement(By.id('password')).sendKeys('dentabase');
    await driver.findElement(By.id('login-button')).click();

    //wait for the "Create Appointment" button to confirm login
    await driver.wait(
      until.elementLocated(By.css('div.text-buttons.create-appointment-text')),
      10000
    );

    //click the Report button
    const reportBtn = await driver.wait(
      until.elementLocated(By.xpath("//span[text()='Report']")),
      5000
    );
    await reportBtn.click();

    //check for the main report sections
    const sections = [
      { name: "Monthly Appointments", locator: By.id('appointmentsChart') },
      { name: "Monthly Revenue", locator: By.id('revenueChart') },
      { name: "Peak Appointment Times", locator: By.id('peakTimesChart') },
      { name: "Service Revenue Contribution", locator: By.id('serviceRevenueChart') }
    ];

    let allVisible = true;

    for (let section of sections) {
      try {
        const elem = await driver.wait(
          until.elementLocated(section.locator),
          10000
        );
        await driver.wait(until.elementIsVisible(elem), 5000);
        console.log(`✅ "${section.name}" chart is visible`);
      } catch {
        console.error(`❌ "${section.name}" chart is missing or not visible`);
        allVisible = false;
      }
    }

    if (!allVisible) process.exitCode = 1;

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

module.exports = runTest;
