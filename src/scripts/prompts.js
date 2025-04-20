/**
 * Collection of default prompts for different use cases
 */
export const DEFAULT_PROMPTS = {

  /**
  * Prompt for generating Selenium Java Page class ONLY
  * (No test class).
  */
  PLAYWRIGHT_JAVA_PAGE_ONLY: `
  Context:
  Given the following DOM structure:
  \`\`\`html
  \${domContent}
  \`\`\`
  
  Instructions:
  Generate Playwright Java PAGE OBJECT CLASS for that DOM.
  
  1. Use recommended Playwright locator strategies in priority:
     - Prefer getByRole(), getByText(), getByLabel() for accessibility
     - Use getByTestId() for test IDs
     - Fall back to CSS/XPath only when necessary
     - Always use strict locators (first()/last()/nth() when needed)
     - Use locator.filter() for complex conditions
  
  2. Implementation guidelines:
     - Use Playwright latest always
     - Use Java 8+ features wherever appropriate
     - DO NOT USE: Hardcoded sleep
     - Add JavaDoc for methods & class
     - Use Javafaker, wherever needed
  
  3. Code structure:
     - Generate a Single page class Only
     - Provide only the code block, no other text or instructions
  
  Example:
  \`\`\`java
  package com.genai.pages;
  
  import com.microsoft.playwright.Page;
  import com.github.javafaker.Faker;
  
  public class ComponentPage {
      private final Page page;
      private final Faker faker;
  
      public ComponentPage(Page page) {
          this.page = page;
          this.faker = new Faker();
      }
  
      // Page elements and methods
  }
  \`\`\`
 `,
 /**
  * Prompt for generating Playwright TypeScript Page class ONLY
  * (No test class).
  */
 PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: `
 Context:
 Given the following DOM structure:
 \\\`html
 \${domContent}
 \\\`
 
 Instructions:
 Generate Playwright Typescript PAGE OBJECT CLASS for that DOM.
 
 1. Use recommended Playwright locator strategies in priority:
    - Prefer getByRole(), getByText(), getByLabel() for accessibility
    - Use getByTestId() for test IDs
    - Fall back to CSS/XPath only when necessary
    - Always use strict locators (first()/last()/nth() when needed)
    - Use locator.filter() for complex conditions
 
 2. Implementation guidelines:
    - Use Playwright latest always
    - DO NOT USE: Hardcoded sleep
 
 3. Code structure:
    - Generate a Single page class Only
    - Provide only the code block, no other text or instructions
 
 Example:
 \\\`typescript
 import { test, expect } from '@playwright/test';

test('Interact with Chennai text element', async ({ page }) => {
  // Navigate to the target page (replace with actual URL)
  await page.goto('https://example.com');

  // Locate the element with class "placeHolderMainText" containing text "Chennai"
  const chennaiText = page.locator('text=Chennai').filter({ has: page.locator('.placeHolderMainText') });

  // Wait for the element to be visible (with timeout of 5 seconds)
  await chennaiText.waitFor({ state: 'visible', timeout: 5000 })
    .catch(error => console.error('Element not found:', error));

  // Verify the element contains expected text
  await expect(chennaiText).toHaveText('Chennai');

  // Example interactions (uncomment what you need):
  
  // 1. Click on the element
  // await chennaiText.click();
  
  // 2. Get the text content
  // const textContent = await chennaiText.textContent();
  // console.log('Text content:', textContent);
  
  // 3. Hover over the element
  // await chennaiText.hover();
});
 \\\`
`,
 /**
  * Prompt for generating Selenium Java Page class ONLY
  * (No test class).
  */
 SELENIUM_JAVA_PAGE_ONLY: `
   Context:
   Given the following DOM structure:
   \`\`\`html
   \${domContent}
   \`\`\`

   Instructions:
   Generate Selenium Java PAGE OBJECT CLASS for that DOM.

   1. Use recommended Selenium locator strategies in priority:
      - By.id (avoid if the id has more than a single number)
      - By.name
      - By.linkText or partialLinkText for links
      - By.xpath (use relative or following or preceding based on best case)

   2. Implementation guidelines:
      - Use Selenium 4.30 or above
      - Use Java 8+ features wherever appropriate
      - Use explicit waits Only (ExpectedConditions)
      - DO NOT USE: Hardcoded waits
      - Add JavaDoc for methods & class
      - Use Javafaker, wherever needed
      - Use PageFactory & @FindBy to show how elements are found

   3. Code structure:
      - Generate a Single page class Only
      - Generate constructor that accepts WebDriver
      - Use PageFactory.initElements
      - Provide only the code block, no other text or instructions

   Example:
   \`\`\`java
   package com.genai.pages;

   import org.openqa.selenium.WebDriver;
   import org.openqa.selenium.support.FindBy;
   import org.openqa.selenium.support.PageFactory;
   import org.openqa.selenium.support.ui.WebDriverWait;
   import java.time.Duration;

   public class ComponentPage {
       private final WebDriver driver;
       private final WebDriverWait wait;

       public ComponentPage(WebDriver driver) {
           this.driver = driver;
           this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
           PageFactory.initElements(driver, this);
       }

       // Page elements and methods
   }
   \`\`\`
 `,
  /**
   * Prompt for generating Selenium Java test code ONLY
   * (No page object class at all).
   */
  SELENIUM_JAVA_TEST_ONLY: `
    Context:
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    Instructions:

    Generate Selenium Java TEST CLASS using TestNG (no page object class).

    1. Use recommended Selenium locator strategies in priority:
       The elements found using locators should be either one of these tags ONLY : input, button, select, a, div
        - Use Only xpath for all elements
        - Use preferably following or following sibling based on the text of the adjacent element
    2. Implementation guidelines:
       - Use Java 8+ features if appropriate
       - Use TestNG for assertions
       - Use explicit waits (ExpectedConditions) ONLY
       - Add JavaDoc for methods
       - Use Javafaker for generating test data

    3. Code structure:
       - Generate only a single test class
       - Use @BeforeMethod, @Test, and @AfterMethod
       - Use meaningful method names
       - Provide only the test class code block, no other text

    Example:
    \`\`\`java
    package com.genai.tests;

    import org.openqa.selenium.WebDriver;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.WebDriverWait;
    import org.testng.annotations.*;
    import com.github.javafaker.Faker;
    import java.time.Duration;

    public class ComponentTest {
        private WebDriver driver;
        private WebDriverWait wait;
        private Faker faker;

        @BeforeMethod
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            faker = new Faker();
            driver.manage().window().maximize();
            driver.get("\${pageUrl}");
        }

        @Test
        public void testComponentAction() {
            // Implementation
        }

        @AfterMethod
        public void tearDown() {
            if (driver != null) {
                driver.quit();
            }
        }
    }
    \`\`\`
  `,
  /**
   * Prompt for generating Cucumber Feature file
   */
  CUCUMBER_ONLY: `
    Context:
    Given the following DOM structure:
    \`\`\`html
    \${domContent}
    \`\`\`

    Instructions:
    Provide **Cucumber (Gherkin) .feature file** referencing **every relevant field** in the DOM snippet.

    1. **Do not** include any explanations or extra text beyond the .feature content.
    2. **Identify** each relevant element (input, textarea, select, button, etc.).
    3. For each element, **create one step** referencing a placeholder (e.g. \`<fieldName>\`):
      - e.g. "When I type <companyName> into the 'Company Name' field"
      - e.g. "And I choose <state> in the 'State' dropdown"
      - e.g. "And I click the 'Create Lead' button"
    4. Use a **Scenario Outline** + **Examples** to parametrize these placeholders.
    5. **Ensure one action per step**.
    6. Output **only** valid Gherkin in a single \`\`\`gherkin code block.

    Produce **only** the .feature content as below :
    \`\`\`gherkin
    Feature: Describe your feature
      As a user of the system
      I want to \${userAction}
      So that <some reason>

      Scenario Outline: A scenario describing \${userAction}
        Given I open "\${pageUrl}"
        # For each input, select, button in the snippet:
        #   - create a single step referencing it with a placeholder
        #   - e.g. "When I enter <companyName> in the 'Company Name' field"
        #   - e.g. "And I click the 'Create Lead' button"
        #   - etc.
        # ...
        Then I should see <some expected outcome>

      # Provide a minimal Examples table with columns for each placeholder:
      Examples:
        | companyName   | firstName   | lastName   | description   | generalCity   | state   |
        | "Acme Corp"   | "Alice"     | "Tester"   | "Some text"   | "Dallas"      | "TX"    |
        | "Mega Corp"   | "Bob"       | "Sample"   | "Other desc"  | "Miami"       | "FL"    |
    \`\`\`
    `
};

/**
 * Helper function to escape code blocks in prompts
 */
function escapeCodeBlocks(text) {
  return text.replace(/```/g, '\\`\\`\\`');
}

/**
 * Function to fill template variables in a prompt
 */
export function getPrompt(promptKey, variables = {}) {
  let prompt = DEFAULT_PROMPTS[promptKey];
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  // Replace all variables in the prompt
  Object.entries(variables).forEach(([k, v]) => {
    const regex = new RegExp(`\\\${${k}}`, 'g');
    prompt = prompt.replace(regex, v);
  });

  return prompt.trim();
}

export const CODE_GENERATOR_TYPES = {
  PLAYWRIGHT_JAVA_PAGE_ONLY: 'Playwright-Java-Page-Only',
  SELENIUM_JAVA_PAGE_ONLY: 'Selenium-Java-Page-Only',
  SELENIUM_JAVA_TEST_ONLY: 'Selenium-Java-Test-Only',
  CUCUMBER_ONLY: 'Cucumber-Only',
  PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: 'Playwright-Typescript-Page-Only'
};
