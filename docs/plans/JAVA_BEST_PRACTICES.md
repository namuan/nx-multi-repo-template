## Step-by-Step Plan: Modern Java Linting in Nx + Maven (Updated)

### Phase 1: Nx Maven Foundation

**Step 1: Ensure Nx Maven Plugin is Configured**
Verify `@nx/maven` is installed and configured in your `nx.json`. This plugin automatically infers Nx tasks from Maven phases.

```json
{
  "plugins": [
    {
      "plugin": "@nx/maven",
      "options": {
        "targetNamePrefix": "mvn-",
        "verbose": false
      }
    }
  ]
}
```

_Why_: The `targetNamePrefix` prevents task name collisions in polyglot repos (e.g., `mvn-verify` vs `lint` for Node projects).

**Step 2: Verify Task Inference**
Run `nx show project <your-java-project> --web` to confirm Nx detects Maven phases (compile, test, verify, etc.).

---

### Phase 2: Code Formatting (Spotless)

**Step 3: Add Spotless Maven Plugin**
Add to your root `pom.xml` (for multi-module) or specific module `pom.xml`:

```xml
<pluginManagement>
  <plugins>
    <plugin>
      <groupId>com.diffplug.spotless</groupId>
      <artifactId>spotless-maven-plugin</artifactId>
      <version>3.2.1</version>
      <configuration>
        <java>
          <googleJavaFormat>
            <version>1.25.2</version>
            <style>AOSP</style>
          </googleJavaFormat>
          <removeUnusedImports />
          <importOrder />
          <formatAnnotations />
        </java>
        <pom>
          <sortPom>
            <encoding>UTF-8</encoding>
            <nrOfIndentSpace>2</nrOfIndentSpace>
          </sortPom>
        </pom>
      </configuration>
    </plugin>
  </plugins>
</pluginManagement>
```

**Step 4: Bind Spotless to Maven Phase**
Add execution to run during `process-sources`:

```xml
<executions>
  <execution>
    <id>spotless-check</id>
    <phase>process-sources</phase>
    <goals>
      <goal>check</goal>
    </goals>
  </execution>
</executions>
```

_Nx Integration_: Now `nx mvn-process-sources <project>` or `nx mvn-verify <project>` will include format checking.

---

### Phase 3: Static Analysis Stack

**Step 5: Add Checkstyle (Code Style)**
Latest: Checkstyle 13.0.0 (requires JDK 21+) + maven-checkstyle-plugin 3.6.0

```xml
<pluginManagement>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-checkstyle-plugin</artifactId>
      <version>3.6.0</version>
      <dependencies>
        <dependency>
          <groupId>com.puppycrawl.tools</groupId>
          <artifactId>checkstyle</artifactId>
          <version>13.0.0</version>
        </dependency>
      </dependencies>
      <configuration>
        <configLocation>google_checks.xml</configLocation>
        <consoleOutput>true</consoleOutput>
        <failsOnError>true</failsOnError>
        <includeTestSourceDirectory>true</includeTestSourceDirectory>
      </configuration>
    </plugin>
  </plugins>
</pluginManagement>
```

Add execution:

```xml
<executions>
  <execution>
    <id>checkstyle-validate</id>
    <phase>validate</phase>
    <goals>
      <goal>check</goal>
    </goals>
  </execution>
</executions>
```

**Step 6: Add PMD (Source Code Analysis)**
Latest: PMD 7.18.0 + maven-pmd-plugin 3.28.0

```xml
<pluginManagement>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-pmd-plugin</artifactId>
      <version>3.28.0</version>
      <dependencies>
        <dependency>
          <groupId>net.sourceforge.pmd</groupId>
          <artifactId>pmd-java</artifactId>
          <version>7.18.0</version>
        </dependency>
      </dependencies>
      <configuration>
        <failOnViolation>true</failOnViolation>
        <printFailingErrors>true</printFailingErrors>
        <analysisCache>true</analysisCache>
        <rulesets>
          <ruleset>category/java/bestpractices.xml</ruleset>
          <ruleset>category/java/errorprone.xml</ruleset>
          <ruleset>category/java/performance.xml</ruleset>
        </rulesets>
      </configuration>
    </plugin>
  </plugins>
</pluginManagement>
```

Add execution:

```xml
<executions>
  <execution>
    <id>pmd-check</id>
    <phase>verify</phase>
    <goals>
      <goal>check</goal>
      <goal>cpd-check</goal>
    </goals>
  </execution>
</executions>
```

**Step 7: Add SpotBugs (Bug Detection)**
Latest: SpotBugs 4.9.8 + spotbugs-maven-plugin 4.9.8.2

```xml
<pluginManagement>
  <plugins>
    <plugin>
      <groupId>com.github.spotbugs</groupId>
      <artifactId>spotbugs-maven-plugin</artifactId>
      <version>4.9.8.2</version>
      <dependencies>
        <dependency>
          <groupId>com.github.spotbugs</groupId>
          <artifactId>spotbugs</artifactId>
          <version>4.9.8</version>
        </dependency>
      </dependencies>
      <configuration>
        <effort>Max</effort>
        <threshold>Medium</threshold>
        <xmlOutput>true</xmlOutput>
        <htmlOutput>true</htmlOutput>
        <failOnError>true</failOnError>
        <plugins>
          <plugin>
            <groupId>com.h3xstream.findsecbugs</groupId>
            <artifactId>findsecbugs-plugin</artifactId>
            <version>1.13.0</version>
          </plugin>
          <plugin>
            <groupId>com.mebigfatguy.sb-contrib</groupId>
            <artifactId>sb-contrib</artifactId>
            <version>7.6.4</version>
          </plugin>
        </plugins>
      </configuration>
    </plugin>
  </plugins>
</pluginManagement>
```

Add execution:

```xml
<executions>
  <execution>
    <id>spotbugs-verify</id>
    <phase>verify</phase>
    <goals>
      <goal>check</goal>
    </goals>
  </execution>
</executions>
```

---

### Phase 4: Compile-Time Analysis (Error Prone)

**Step 8: Add Error Prone**
Latest: Error Prone 2.43.0

Add to `maven-compiler-plugin` configuration:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>3.14.0</version>
  <configuration>
    <source>21</source>
    <target>21</target>
    <encoding>UTF-8</encoding>
    <compilerArgs>
      <arg>-XDcompilePolicy=simple</arg>
      <arg>--should-stop=ifError=FLOW</arg>
      <arg>-Xplugin:ErrorProne</arg>
      <!-- Required for JDK 21 -->
      <arg>-XDaddTypeAnnotationsToSymbol=true</arg>
    </compilerArgs>
    <annotationProcessorPaths>
      <path>
        <groupId>com.google.errorprone</groupId>
        <artifactId>error_prone_core</artifactId>
        <version>2.43.0</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>
```

_Note_: Error Prone runs during `compile` phase automatically and catches common bugs at compile time.

---

### Phase 5: Nx Task Orchestration

**Step 9: Configure Task Dependencies in Nx**
Add to `nx.json` to ensure proper task ordering:

```json
{
  "targetDefaults": {
    "mvn-compile": {
      "inputs": ["{projectRoot}/src/**/*"],
      "outputs": ["{projectRoot}/target/classes"]
    },
    "mvn-verify": {
      "dependsOn": ["mvn-compile", "mvn-test"],
      "inputs": ["{projectRoot}/src/**/*", "{projectRoot}/pom.xml"]
    }
  }
}
```

**Step 10: Create Nx Lint Target (Optional)**
If you want a unified `lint` target, add to your Java project's `project.json` (if exists) or create a target that runs:

```bash
nx run-many -t mvn-process-sources mvn-verify -p <your-java-project>
```

Or use Nx run commands:

```bash
# Check formatting
nx mvn-process-sources my-java-service

# Full linting (style + bugs)
nx mvn-verify my-java-service

# Run all linting across affected projects
nx affected -t mvn-verify
```

---

### Phase 6: IDE Integration & Git Hooks

**Step 11: IDE Setup**

- **IntelliJ**: Install Checkstyle-IDEA, SpotBugs, and PMD plugins
- **VS Code**: Install Checkstyle, SpotBugs extensions
- **Eclipse**: Install Checkstyle plugin, SpotBugs plugin

**Step 12: Pre-commit Hook (Optional)**
Add to root `package.json` (if using Node for Nx):

```json
{
  "lint-staged": {
    "*.java": ["nx mvn-process-sources --uncommitted", "git add"]
  }
}
```

Or use Maven git hooks via `git-build-hook-maven-plugin`.

---

### Phase 7: CI/CD Integration

**Step 13: CI Pipeline Configuration**
Example GitHub Actions:

```yaml
- name: Nx Lint Java
  run: |
    nx affected -t mvn-process-sources --parallel=3
    nx affected -t mvn-verify --parallel=1
```

_Why parallel=1 for verify_: SpotBugs and PMD can be resource-intensive; run sequentially to avoid memory issues.

---

## Summary of Tools Selected

| Tool            | Version | Purpose           | Phase           | Active      |
| --------------- | ------- | ----------------- | --------------- | ----------- |
| **Spotless**    | 3.2.1   | Code formatting   | process-sources | ✅ Jan 2026 |
| **Checkstyle**  | 13.0.0  | Style enforcement | validate        | ✅ Jan 2026 |
| **PMD**         | 7.18.0  | Static analysis   | verify          | ✅ Oct 2025 |
| **SpotBugs**    | 4.9.8   | Bug detection     | verify          | ✅ Nov 2025 |
| **Error Prone** | 2.43.0  | Compile-time bugs | compile         | ✅ Oct 2025 |

---

## Key Commands

```bash
# Format check only
nx mvn-process-sources my-project

# Style check only (if configured separately)
nx mvn-checkstyle:check my-project

# Full verification (all linting + tests)
nx mvn-verify my-project

# Run all linting across affected projects
nx affected -t mvn-verify

# View project tasks
nx show project my-project --web
```
