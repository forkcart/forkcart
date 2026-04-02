/**
 * @fileoverview HTML template for the installer wizard
 */

import type { Language } from './types';
import { getAllTranslations } from './i18n';

/**
 * Generate the complete HTML page for the installer wizard
 */
export function generateHTML(lang: Language = 'en'): string {
  const t = getAllTranslations(lang);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ForkCart Setup</title>
  <style>
    :root {
      --primary: #10b981;
      --primary-dark: #065f46;
      --primary-light: #d1fae5;
      --bg: #f8fafc;
      --bg-card: #ffffff;
      --bg-input: #f1f5f9;
      --text: #0f172a;
      --text-muted: #64748b;
      --error: #ef4444;
      --success: #10b981;
      --warning: #f59e0b;
      --border: #e2e8f0;
      --radius: 12px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }

    .container {
      max-width: 600px;
      width: 100%;
    }

    .logo {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo img {
      height: 60px;
      width: auto;
    }

    .logo h1 {
      font-size: 1.5rem;
      margin-top: 10px;
      font-weight: 600;
    }

    .progress-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      position: relative;
    }

    .progress-bar::before {
      content: '';
      position: absolute;
      top: 15px;
      left: 30px;
      right: 30px;
      height: 2px;
      background: var(--border);
      z-index: 0;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .progress-step .number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .progress-step.active .number {
      background: var(--primary);
      border-color: var(--primary);
    }

    .progress-step.completed .number {
      background: var(--primary);
      border-color: var(--primary);
    }

    .progress-step.completed .number::after {
      content: '✓';
    }

    .progress-step .label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 8px;
      text-align: center;
      max-width: 80px;
    }

    .card {
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 32px;
      box-shadow: var(--shadow);
    }

    .step {
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .step.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 6px;
      color: var(--text);
    }

    input, select {
      width: 100%;
      padding: 12px 16px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
    }

    input::placeholder {
      color: var(--text-muted);
    }

    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    .checkbox-group {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 16px;
    }

    .checkbox-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
      margin-top: 2px;
      accent-color: var(--primary);
    }

    .checkbox-label {
      flex: 1;
    }

    .checkbox-label .desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: var(--primary);
      color: #000;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-primary:disabled {
      background: var(--border);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-input);
    }

    .btn-test {
      background: var(--bg-input);
      color: var(--text);
      border: 1px solid var(--border);
      margin-top: 16px;
      width: 100%;
    }

    .btn-test:hover {
      border-color: var(--primary);
    }

    .nav-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      gap: 16px;
    }

    .nav-buttons .btn {
      flex: 1;
    }

    .check-item {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--bg-input);
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .check-item .icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .check-item .icon.pass {
      color: var(--success);
    }

    .check-item .icon.fail {
      color: var(--error);
    }

    .check-item .icon.pending {
      color: var(--text-muted);
    }

    .check-item .text {
      flex: 1;
    }

    .check-item .message {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .test-result {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      display: none;
    }

    .test-result.success {
      display: block;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid var(--success);
      color: var(--success);
    }

    .test-result.error {
      display: block;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--error);
      color: var(--error);
    }

    .error-message {
      color: var(--error);
      font-size: 0.875rem;
      margin-top: 6px;
      display: none;
    }

    .error-message.show {
      display: block;
    }

    .review-section {
      margin-bottom: 24px;
    }

    .review-section h3 {
      font-size: 1rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .review-section h3::before {
      content: '';
      width: 4px;
      height: 16px;
      background: var(--primary);
      border-radius: 2px;
    }

    .review-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }

    .review-item:last-child {
      border-bottom: none;
    }

    .review-item .label {
      color: var(--text-muted);
    }

    .install-progress {
      margin-top: 24px;
    }

    .install-step {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .install-step:last-child {
      border-bottom: none;
    }

    .install-step .icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
    }

    .install-step.pending .icon {
      color: var(--text-muted);
    }

    .install-step.running .icon {
      color: var(--warning);
      animation: pulse 1s infinite;
    }

    .install-step.completed .icon {
      color: var(--success);
    }

    .install-step.error .icon {
      color: var(--error);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .success-box {
      text-align: center;
      padding: 20px 0;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      color: var(--success);
    }

    .success-links {
      display: flex;
      gap: 16px;
      margin-top: 24px;
    }

    .success-links a {
      flex: 1;
      padding: 16px;
      background: var(--bg-input);
      border-radius: 8px;
      text-decoration: none;
      color: var(--text);
      text-align: center;
      transition: all 0.2s ease;
    }

    .success-links a:hover {
      background: var(--primary);
      color: #000;
    }

    .warning-box {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--warning);
      color: var(--warning);
      padding: 16px;
      border-radius: 8px;
      margin-top: 24px;
      text-align: center;
    }

    .credentials-box {
      background: var(--bg-input);
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
      text-align: left;
    }

    .credentials-box p {
      margin: 8px 0;
    }

    .credentials-box .value {
      font-family: monospace;
      background: var(--bg);
      padding: 4px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }

    .language-select {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .lang-btn {
      padding: 12px 24px;
      background: var(--bg-input);
      border: 2px solid transparent;
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1rem;
    }

    .lang-btn:hover {
      border-color: var(--border);
    }

    .lang-btn.active {
      border-color: var(--primary);
      background: rgba(34, 197, 94, 0.1);
    }

    .hint {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 6px;
    }

    @media (max-width: 600px) {
      body {
        padding: 20px 16px;
      }

      .card {
        padding: 24px 20px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .progress-step .label {
        display: none;
      }

      .nav-buttons {
        flex-direction: column-reverse;
      }

      .success-links {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="/logo" alt="ForkCart" />
    </div>

    <div class="progress-bar" id="progressBar">
      <div class="progress-step active" data-step="1">
        <div class="number">1</div>
        <div class="label">Welcome</div>
      </div>
      <div class="progress-step" data-step="2">
        <div class="number">2</div>
        <div class="label">System</div>
      </div>
      <div class="progress-step" data-step="3">
        <div class="number">3</div>
        <div class="label">Database</div>
      </div>
      <div class="progress-step" data-step="4">
        <div class="number">4</div>
        <div class="label">Admin</div>
      </div>
      <div class="progress-step" data-step="5">
        <div class="number">5</div>
        <div class="label">Settings</div>
      </div>
      <div class="progress-step" data-step="6">
        <div class="number">6</div>
        <div class="label">Review</div>
      </div>
      <div class="progress-step" data-step="7">
        <div class="number">7</div>
        <div class="label">Done</div>
      </div>
    </div>

    <div class="card">
      <!-- Step 1: Welcome -->
      <div class="step active" id="step1">
        <h2 data-i18n="welcome.title">${t['welcome.title']}</h2>
        <p class="subtitle" data-i18n="welcome.subtitle">${t['welcome.subtitle']}</p>

        <div class="form-group">
          <label data-i18n="welcome.language">${t['welcome.language']}</label>
          <div class="language-select">
            <button type="button" class="lang-btn ${lang === 'en' ? 'active' : ''}" data-lang="en">🇬🇧 English</button>
            <button type="button" class="lang-btn ${lang === 'de' ? 'active' : ''}" data-lang="de">🇩🇪 Deutsch</button>
          </div>
        </div>

        <div class="nav-buttons">
          <div></div>
          <button type="button" class="btn btn-primary" onclick="nextStep()" data-i18n="welcome.start">${t['welcome.start']}</button>
        </div>
      </div>

      <!-- Step 2: System Check -->
      <div class="step" id="step2">
        <h2 data-i18n="systemCheck.title">${t['systemCheck.title']}</h2>
        <p class="subtitle" data-i18n="systemCheck.subtitle">${t['systemCheck.subtitle']}</p>

        <div id="systemChecks">
          <div class="check-item" id="check-node">
            <span class="icon pending">⏳</span>
            <div class="text">
              <div data-i18n="systemCheck.nodeVersion">${t['systemCheck.nodeVersion']}</div>
              <div class="message"></div>
            </div>
          </div>
          <div class="check-item" id="check-pg">
            <span class="icon pending">⏳</span>
            <div class="text">
              <div data-i18n="systemCheck.postgresql">${t['systemCheck.postgresql']}</div>
              <div class="message"></div>
            </div>
          </div>
          <div class="check-item" id="check-disk">
            <span class="icon pending">⏳</span>
            <div class="text">
              <div data-i18n="systemCheck.diskSpace">${t['systemCheck.diskSpace']}</div>
              <div class="message"></div>
            </div>
          </div>
          <div class="check-item" id="check-pnpm">
            <span class="icon pending">⏳</span>
            <div class="text">
              <div data-i18n="systemCheck.pnpm">${t['systemCheck.pnpm']}</div>
              <div class="message"></div>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-test" onclick="runSystemCheck()" data-i18n="systemCheck.recheck">${t['systemCheck.recheck']}</button>

        <div class="nav-buttons">
          <button type="button" class="btn btn-secondary" onclick="prevStep()" data-i18n="nav.back">${t['nav.back']}</button>
          <button type="button" class="btn btn-primary" id="step2Next" onclick="nextStep()" disabled data-i18n="nav.next">${t['nav.next']}</button>
        </div>
      </div>

      <!-- Step 3: Database -->
      <div class="step" id="step3">
        <h2 data-i18n="database.title">${t['database.title']}</h2>
        <p class="subtitle" data-i18n="database.subtitle">${t['database.subtitle']}</p>

        <div class="db-type-toggle" style="display:flex;gap:8px;margin-bottom:24px">
          <button type="button" class="btn btn-primary" id="dbTypeLocal" onclick="setDbType('local')" style="flex:1">🐘 Local PostgreSQL</button>
          <button type="button" class="btn btn-secondary" id="dbTypeSupabase" onclick="setDbType('supabase')" style="flex:1">⚡ Supabase</button>
        </div>

        <div id="dbLocalFields">
          <div class="form-row">
            <div class="form-group">
              <label for="dbHost" data-i18n="database.host">${t['database.host']}</label>
              <input type="text" id="dbHost" value="localhost" required>
            </div>
            <div class="form-group">
              <label for="dbPort" data-i18n="database.port">${t['database.port']}</label>
              <input type="number" id="dbPort" value="5432" required>
            </div>
          </div>

          <div class="form-group">
            <label for="dbUser" data-i18n="database.username">${t['database.username']}</label>
            <input type="text" id="dbUser" value="forkcart" required>
          </div>

          <div class="form-group">
            <label for="dbPassword" data-i18n="database.password">${t['database.password']}</label>
            <input type="password" id="dbPassword" required>
          </div>

          <div class="form-group">
            <label for="dbName" data-i18n="database.name">${t['database.name']}</label>
            <input type="text" id="dbName" value="forkcart" required>
          </div>

          <div class="checkbox-group">
            <input type="checkbox" id="dbCreate" checked>
            <label for="dbCreate" class="checkbox-label" data-i18n="database.createDb">${t['database.createDb']}</label>
          </div>
        </div>

        <div id="dbSupabaseFields" style="display:none">
          <div class="form-group">
            <label for="supabaseUrl">Supabase Connection String</label>
            <input type="text" id="supabaseUrl" placeholder="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" required>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">Find this in Supabase → Settings → Database → Connection String (URI)</p>
          </div>
        </div>

        <button type="button" class="btn btn-test" id="testDbBtn" onclick="testDatabase()">
          <span data-i18n="database.test">${t['database.test']}</span>
        </button>

        <div class="test-result" id="dbTestResult"></div>

        <div class="nav-buttons">
          <button type="button" class="btn btn-secondary" onclick="prevStep()" data-i18n="nav.back">${t['nav.back']}</button>
          <button type="button" class="btn btn-primary" id="step3Next" onclick="nextStep()" disabled data-i18n="nav.next">${t['nav.next']}</button>
        </div>
      </div>

      <!-- Step 4: Admin Account -->
      <div class="step" id="step4">
        <h2 data-i18n="admin.title">${t['admin.title']}</h2>
        <p class="subtitle" data-i18n="admin.subtitle">${t['admin.subtitle']}</p>

        <div class="form-group">
          <label for="adminEmail" data-i18n="admin.email">${t['admin.email']}</label>
          <input type="email" id="adminEmail" placeholder="admin@example.com" required>
        </div>

        <div class="form-group">
          <label for="adminPassword" data-i18n="admin.password">${t['admin.password']}</label>
          <input type="password" id="adminPassword" minlength="8" required>
          <div class="error-message" id="passwordError" data-i18n="admin.passwordTooShort">${t['admin.passwordTooShort']}</div>
        </div>

        <div class="form-group">
          <label for="adminPasswordConfirm" data-i18n="admin.confirmPassword">${t['admin.confirmPassword']}</label>
          <input type="password" id="adminPasswordConfirm" required>
          <div class="error-message" id="passwordMatchError" data-i18n="admin.passwordMismatch">${t['admin.passwordMismatch']}</div>
        </div>

        <div class="form-group">
          <label for="shopName" data-i18n="admin.shopName">${t['admin.shopName']}</label>
          <input type="text" id="shopName" placeholder="My Awesome Shop" required>
        </div>

        <div class="nav-buttons">
          <button type="button" class="btn btn-secondary" onclick="prevStep()" data-i18n="nav.back">${t['nav.back']}</button>
          <button type="button" class="btn btn-primary" id="step4Next" onclick="validateAdminAndNext()" data-i18n="nav.next">${t['nav.next']}</button>
        </div>
      </div>

      <!-- Step 5: Shop Settings -->
      <div class="step" id="step5">
        <h2 data-i18n="shop.title">${t['shop.title']}</h2>
        <p class="subtitle" data-i18n="shop.subtitle">${t['shop.subtitle']}</p>

        <div class="form-row">
          <div class="form-group">
            <label for="shopCurrency" data-i18n="shop.currency">${t['shop.currency']}</label>
            <select id="shopCurrency">
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
          <div class="form-group">
            <label for="shopLanguage" data-i18n="shop.language">${t['shop.language']}</label>
            <select id="shopLanguage">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div class="checkbox-group">
          <input type="checkbox" id="loadDemoData" checked>
          <div class="checkbox-label">
            <label for="loadDemoData" data-i18n="shop.demoData">${t['shop.demoData']}</label>
            <div class="desc" data-i18n="shop.demoDataDesc">${t['shop.demoDataDesc']}</div>
          </div>
        </div>

        <div class="form-group" style="margin-top: 20px;">
          <label for="shopDomain">Domain (optional)</label>
          <input type="text" id="shopDomain" placeholder="https://myshop.com">
          <div class="hint">Leave empty to use the current URL. Set this if you have a custom domain.</div>
        </div>



        <div class="nav-buttons">
          <button type="button" class="btn btn-secondary" onclick="prevStep()" data-i18n="nav.back">${t['nav.back']}</button>
          <button type="button" class="btn btn-primary" onclick="nextStep()" data-i18n="nav.next">${t['nav.next']}</button>
        </div>
      </div>

      <!-- Step 6: Review & Install -->
      <div class="step" id="step6">
        <h2 data-i18n="review.title">${t['review.title']}</h2>
        <p class="subtitle" data-i18n="review.subtitle">${t['review.subtitle']}</p>

        <div class="review-section">
          <h3 data-i18n="review.database">${t['review.database']}</h3>
          <div class="review-item">
            <span class="label">Host</span>
            <span id="reviewDbHost"></span>
          </div>
          <div class="review-item">
            <span class="label">Database</span>
            <span id="reviewDbName"></span>
          </div>
        </div>

        <div class="review-section">
          <h3 data-i18n="review.admin">${t['review.admin']}</h3>
          <div class="review-item">
            <span class="label">Email</span>
            <span id="reviewAdminEmail"></span>
          </div>
          <div class="review-item">
            <span class="label">Shop Name</span>
            <span id="reviewShopName"></span>
          </div>
        </div>

        <div class="review-section">
          <h3 data-i18n="review.settings">${t['review.settings']}</h3>
          <div class="review-item">
            <span class="label">Currency</span>
            <span id="reviewCurrency"></span>
          </div>
          <div class="review-item">
            <span class="label">Language</span>
            <span id="reviewLanguage"></span>
          </div>
          <div class="review-item">
            <span class="label">Demo Data</span>
            <span id="reviewDemoData"></span>
          </div>
        </div>

        <div class="nav-buttons">
          <button type="button" class="btn btn-secondary" onclick="prevStep()" data-i18n="nav.back">${t['nav.back']}</button>
          <button type="button" class="btn btn-primary" id="installBtn" onclick="startInstallation()" data-i18n="review.install">${t['review.install']}</button>
        </div>
      </div>

      <!-- Step 7: Installing / Success -->
      <div class="step" id="step7">
        <div id="installingView">
          <h2 data-i18n="install.title">${t['install.title']}</h2>
          <p class="subtitle" data-i18n="install.progress">${t['install.progress']}</p>

          <div class="install-progress" id="installProgress">
            <!-- Steps will be added dynamically -->
          </div>
        </div>

        <div id="successView" style="display: none;">
          <div class="success-box">
            <svg class="success-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <h2>Installation complete! 🎉</h2>
            <p class="subtitle" id="handoverStatus">Starting your shop...</p>
            <div style="margin: 20px 0;" id="handoverSpinner">
              <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top:3px solid #10b981;border-radius:50%;margin:0 auto;animation:spin 1s linear infinite"></div>
              <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            </div>

            <div class="success-links" style="margin: 16px 0;">
              <a id="adminLink" href="/admin" target="_blank">⚙️ Admin Panel (/admin)</a>
            </div>

            <div class="credentials-box">
              <strong data-i18n="success.credentials">${t['success.credentials']}</strong>
              <p>Email: <span class="value" id="finalEmail"></span></p>
              <p>Password: <span class="value" id="finalPassword"></span></p>
            </div>

            <div class="warning-box" data-i18n="success.warning">${t['success.warning']}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;
    let currentLang = '${lang}';
    let systemCheckPassed = false;
    let dbTestPassed = false;
    let dbType = 'local';

    function setDbType(type) {
      dbType = type;
      document.getElementById('dbLocalFields').style.display = type === 'local' ? 'block' : 'none';
      document.getElementById('dbSupabaseFields').style.display = type === 'supabase' ? 'block' : 'none';
      document.getElementById('dbTypeLocal').className = type === 'local' ? 'btn btn-primary' : 'btn btn-secondary';
      document.getElementById('dbTypeSupabase').className = type === 'supabase' ? 'btn btn-primary' : 'btn btn-secondary';
      dbTestPassed = false;
      document.getElementById('step3Next').disabled = true;
      document.getElementById('dbTestResult').innerHTML = '';
    }

    const translations = ${JSON.stringify(getAllTranslations(lang))};

    // Language switching
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.dataset.lang;
        if (newLang !== currentLang) {
          window.location.href = '/?lang=' + newLang;
        }
      });
    });

    function updateProgressBar() {
      document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < currentStep) {
          step.classList.add('completed');
        } else if (stepNum === currentStep) {
          step.classList.add('active');
        }
      });
    }

    function showStep(step) {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      const stepEl = document.getElementById('step' + step);
      if (stepEl) stepEl.classList.add('active');
      currentStep = step;
      updateProgressBar();

      // Run system check when entering step 2
      if (step === 2 && !systemCheckPassed) {
        runSystemCheck();
      }

      // Update review when entering step 6
      if (step === 6) {
        updateReview();
      }
    }

    function nextStep() {
      if (currentStep < 7) {
        showStep(currentStep + 1);
      }
    }

    function prevStep() {
      if (currentStep > 1) {
        showStep(currentStep - 1);
      }
    }

    async function runSystemCheck() {
      const checks = {
        'check-node': { icon: '⏳', message: '' },
        'check-pg': { icon: '⏳', message: '' },
        'check-disk': { icon: '⏳', message: '' },
        'check-pnpm': { icon: '⏳', message: '' },
      };

      // Reset UI
      Object.keys(checks).forEach(id => {
        const el = document.getElementById(id);
        el.querySelector('.icon').textContent = '⏳';
        el.querySelector('.icon').classList.remove('pass', 'fail');
        el.querySelector('.icon').classList.add('pending');
        el.querySelector('.message').textContent = '';
      });

      try {
        const response = await fetch('/api/check');
        const data = await response.json();

        // Update Node.js check
        updateCheckItem('check-node', data.nodeVersion);
        updateCheckItem('check-pg', data.postgresql);
        updateCheckItem('check-disk', data.diskSpace);
        updateCheckItem('check-pnpm', data.pnpm);

        systemCheckPassed = data.allPassed;
        document.getElementById('step2Next').disabled = !systemCheckPassed;
      } catch (error) {
        console.error('System check failed:', error);
      }
    }

    function updateCheckItem(id, result) {
      const el = document.getElementById(id);
      const icon = el.querySelector('.icon');
      const message = el.querySelector('.message');

      icon.classList.remove('pending', 'pass', 'fail');
      if (result.passed) {
        icon.textContent = '✓';
        icon.classList.add('pass');
      } else {
        icon.textContent = '✗';
        icon.classList.add('fail');
      }
      message.textContent = result.message;
    }

    async function testDatabase() {
      const btn = document.getElementById('testDbBtn');
      const result = document.getElementById('dbTestResult');
      const nextBtn = document.getElementById('step3Next');

      btn.disabled = true;
      btn.textContent = translations['database.testing'] || 'Testing...';
      result.className = 'test-result';
      result.style.display = 'none';

      try {
        let dbPayload;
        if (dbType === 'supabase') {
          const connStr = document.getElementById('supabaseUrl').value;
          dbPayload = { connectionString: connStr };
        } else {
          dbPayload = {
            host: document.getElementById('dbHost').value,
            port: parseInt(document.getElementById('dbPort').value),
            username: document.getElementById('dbUser').value,
            password: document.getElementById('dbPassword').value,
            database: document.getElementById('dbName').value,
            createDatabase: document.getElementById('dbCreate').checked,
          };
        }

        const response = await fetch('/api/test-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbPayload),
        });

        const data = await response.json();

        result.textContent = data.message;
        result.className = 'test-result ' + (data.success ? 'success' : 'error');
        result.style.display = 'block';

        dbTestPassed = data.success;
        nextBtn.disabled = !dbTestPassed;
      } catch (error) {
        result.textContent = 'Connection test failed: ' + error.message;
        result.className = 'test-result error';
        result.style.display = 'block';
      }

      btn.disabled = false;
      btn.innerHTML = '<span data-i18n="database.test">' + (translations['database.test'] || 'Test Connection') + '</span>';
    }

    function validateAdminAndNext() {
      const password = document.getElementById('adminPassword').value;
      const confirmPassword = document.getElementById('adminPasswordConfirm').value;
      const email = document.getElementById('adminEmail').value;
      const shopName = document.getElementById('shopName').value;

      // Reset errors
      document.getElementById('passwordError').classList.remove('show');
      document.getElementById('passwordMatchError').classList.remove('show');

      let valid = true;

      if (password.length < 8) {
        document.getElementById('passwordError').classList.add('show');
        valid = false;
      }

      if (password !== confirmPassword) {
        document.getElementById('passwordMatchError').classList.add('show');
        valid = false;
      }

      if (!email || !shopName) {
        valid = false;
      }

      if (valid) {
        nextStep();
      }
    }

    function updateReview() {
      if (dbType === 'supabase') {
        const url = document.getElementById('supabaseUrl').value;
        document.getElementById('reviewDbHost').textContent = 'Supabase';
        document.getElementById('reviewDbName').textContent = url.substring(0, 40) + '...';
      } else {
        document.getElementById('reviewDbHost').textContent = 
          document.getElementById('dbHost').value + ':' + document.getElementById('dbPort').value;
        document.getElementById('reviewDbName').textContent = document.getElementById('dbName').value;
      }
      document.getElementById('reviewAdminEmail').textContent = document.getElementById('adminEmail').value;
      document.getElementById('reviewShopName').textContent = document.getElementById('shopName').value;
      document.getElementById('reviewCurrency').textContent = document.getElementById('shopCurrency').value;
      document.getElementById('reviewLanguage').textContent = 
        document.getElementById('shopLanguage').options[document.getElementById('shopLanguage').selectedIndex].text;
      document.getElementById('reviewDemoData').textContent = 
        document.getElementById('loadDemoData').checked ? '✓' : '✗';
    }

    async function startInstallation() {
      showStep(7);
      document.getElementById('installBtn').disabled = true;

      const dbConfig = dbType === 'supabase'
        ? { connectionString: document.getElementById('supabaseUrl').value }
        : {
            host: document.getElementById('dbHost').value,
            port: parseInt(document.getElementById('dbPort').value),
            username: document.getElementById('dbUser').value,
            password: document.getElementById('dbPassword').value,
            database: document.getElementById('dbName').value,
            createDatabase: document.getElementById('dbCreate').checked,
          };

      const config = {
        database: dbConfig,
        admin: {
          email: document.getElementById('adminEmail').value,
          password: document.getElementById('adminPassword').value,
          shopName: document.getElementById('shopName').value,
        },
        shop: {
          currency: document.getElementById('shopCurrency').value,
          language: document.getElementById('shopLanguage').value,
          loadDemoData: document.getElementById('loadDemoData').checked,
          domain: document.getElementById('shopDomain').value || undefined,

        },
      };

      // Start installation
      try {
        const response = await fetch('/api/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });

        // Poll for status
        pollInstallStatus(config);
      } catch (error) {
        console.error('Installation failed:', error);
      }
    }

    async function pollInstallStatus(config) {
      const progressEl = document.getElementById('installProgress');

      const poll = async () => {
        try {
          const response = await fetch('/api/status');
          const status = await response.json();

          // Update progress UI
          progressEl.innerHTML = status.steps.map(step => {
            let icon = '⏳';
            let className = 'pending';
            if (step.status === 'running') {
              icon = '🔄';
              className = 'running';
            } else if (step.status === 'completed') {
              icon = '✓';
              className = 'completed';
            } else if (step.status === 'error') {
              icon = '✗';
              className = 'error';
            }

            return \`
              <div class="install-step \${className}">
                <span class="icon">\${icon}</span>
                <span>\${step.label}\${step.message ? ': ' + step.message : ''}</span>
              </div>
            \`;
          }).join('');

          if (status.completed) {
            // Show success view
            document.getElementById('installingView').style.display = 'none';
            document.getElementById('successView').style.display = 'block';
            document.getElementById('finalEmail').textContent = config.admin.email;
            document.getElementById('finalPassword').textContent = '••••••••';

            // Trigger handover: installer shuts down, storefront takes over
            fetch('/api/handover', { method: 'POST' })
              .then(function() {
                document.getElementById('handoverStatus').textContent = 'Starting storefront...';
                // Poll until the storefront is serving (installer has exited, storefront took the port)
                var attempts = 0;
                var pollForShop = setInterval(function() {
                  attempts++;
                  fetch(window.location.origin, { mode: 'no-cors' })
                    .then(function() {
                      // Something is responding — storefront might be up
                      if (attempts > 5) {
                        clearInterval(pollForShop);
                        document.getElementById('handoverStatus').textContent = 'Your shop is ready! Reloading...';
                        document.getElementById('handoverSpinner').style.display = 'none';
                        setTimeout(function() { window.location.reload(); }, 2000);
                      }
                    })
                    .catch(function() {
                      // Port not yet available — keep waiting
                      document.getElementById('handoverStatus').textContent = 'Starting storefront... (' + attempts + 's)';
                    });
                  if (attempts > 60) {
                    clearInterval(pollForShop);
                    document.getElementById('handoverStatus').innerHTML = 'Storefront is starting. Refresh this page in a moment, or run:<br><code>pnpm --filter @forkcart/storefront start</code>';
                    document.getElementById('handoverSpinner').style.display = 'none';
                  }
                }, 1000);
              })
              .catch(function() {
                document.getElementById('handoverStatus').innerHTML = 'Run <code>pnpm build && pnpm start</code> to start your shop.';
                document.getElementById('handoverSpinner').style.display = 'none';
              });
          } else if (status.error) {
            // Show error
            progressEl.innerHTML += \`
              <div class="test-result error" style="display: block; margin-top: 20px;">
                Installation failed: \${status.error}
              </div>
            \`;
          } else {
            // Continue polling
            setTimeout(poll, 500);
          }
        } catch (error) {
          console.error('Status poll failed:', error);
          setTimeout(poll, 1000);
        }
      };

      poll();
    }

    // Initialize
    showStep(1);
  </script>
</body>
</html>`;
}
