document.getElementById('jsonFile').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      displayReport(data);
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});

function displayReport(data) {
  const itrType = Object.keys(data.ITR || {})[0];
  const itr = data.ITR?.[itrType];
  if (!itr) return alert("Unsupported or invalid ITR format");

  const htmlSections = [];
  // PERSONAL INFO
  const name = itr.Verification?.Declaration?.AssesseeVerName ?? 'N/A';
  const personal = itr.PersonalInfo || {};
  const address = personal.Address || {};
  htmlSections.push(`
    <section class="pdf-section">
      <h4>Personal Info</h4>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>PAN:</strong> ${personal.PAN ?? 'N/A'}</p>
      <p><strong>DOB:</strong> ${personal.DOB ?? 'N/A'}</p>
      <p><strong>Aadhaar:</strong> ${personal.AadhaarCardNo ?? 'N/A'}</p>
      <p><strong>Mobile:</strong> ${address.CountryCodeMobile ?? ''} ${address.MobileNo ?? 'N/A'}</p>
      <p><strong>Email:</strong> ${address.EmailAddress ?? 'N/A'}</p>
      <p><strong>Address:</strong> 
        ${address.ResidenceNo ?? ''}, 
        ${address.RoadOrStreet ?? ''}, 
        ${address.LocalityOrArea ?? ''}, 
        ${address.CityOrTownOrDistrict ?? ''} - 
        ${address.PinCode ?? ''}
      </p>
    </section>
  `);
  // FORM DETAILS
  const form = itr.Form_ITR1;
  if (form) {
    htmlSections.push(`
      <section class="pdf-section">
        <h4>Form ITR1 Details</h4>
        <table class="styled-table section-table" border="1">
          <thead><tr><th>Description</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Form Name</td><td>${form.FormName ?? 'N/A'}</td></tr>
            <tr><td>Assessment Year</td><td>${form.AssessmentYear ? `${form.AssessmentYear}-${parseInt(form.AssessmentYear) + 1}` : 'N/A'}</td></tr>
          </tbody>
        </table>
      </section>
    `);
  }



  // INCOME DETAILS
  const income = itr.ITR1_IncomeDeductions || {};
  htmlSections.push(`
    <section class="pdf-section">
      <h4>Income Details</h4>
      <table class="styled-table section-table" border="1">
        <thead><tr><th>Description</th><th>Amount (₹)</th></tr></thead>
        <tbody>
          <tr><td>Salary (Basic)</td><td style="text-align:right">₹ ${formatAmount(income.Salary ?? 0)}</td></tr>
          <tr><td>Perquisites</td><td style="text-align:right">₹ ${formatAmount(income.PerquisitesValue ?? 0)}</td></tr>
          <tr><td>Profits in Salary</td><td style="text-align:right">₹ ${formatAmount(income.ProfitsInSalary ?? 0)}</td></tr>
          <tr><td>Gross Salary</td><td style="text-align:right">₹ ${formatAmount(income.GrossSalary ?? 0)}</td></tr>
          <tr><td>Net Salary</td><td style="text-align:right">₹ ${formatAmount(income.NetSalary ?? 0)}</td></tr>
          <tr><td>Deductions u/s 16</td><td style="text-align:right">₹ ${formatAmount(income.DeductionUs16 ?? 0)}</td></tr>
          <tr><td><strong>Income from Salary</strong></td><td style="text-align:right"><strong>₹ ${formatAmount(income.IncomeFromSal ?? 0)}</strong></td></tr>
        </tbody>
      </table>
    </section>
  `);

  // OTHER SECTIONS
  const selectedSections = {
    'Filing Status': itr.FilingStatus,
    'ITR1 Tax Computation': itr.ITR1_TaxComputation,
    'Income Deductions': itr.ITR1_IncomeDeductions,
    'LTCG112A': itr.LTCG112A,
    'Tax Paid': itr.TaxPaid,
    'Refund': itr.Refund,
    'Verification': itr.Verification
  };

  for (const [label, content] of Object.entries(selectedSections)) {
    if (!content) continue;
    if (Array.isArray(content)) {
      htmlSections.push(`<section class="pdf-section"><h4>${formatTitle(label)}</h4>${renderArray(content)}</section>`);
    } else {
      htmlSections.push(renderObject(content, label));
    }
  }

  document.getElementById('report').innerHTML = `
    <div id="reportContent" class="pdf-report">
      <h2>Income Tax Return Summary (${itrType})</h2>
      ${htmlSections.join('')}
    </div>
  `;
}

// Format numbers
function formatAmount(val) {
  return typeof val === 'number' && !isNaN(val) ? val.toLocaleString('en-IN') : '0';
}

// Render object as table
function renderObject(obj, title = '') {
  let html = `<section class="pdf-section">
    ${title ? `<h4>${formatTitle(title)}</h4>` : ''}
    <table class="styled-table section-table" border="1">
      <thead><tr><th>Description</th><th>Value</th></tr></thead>
      <tbody>`;

  for (const key in obj) {
    const value = obj[key];
    if (value == null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      html += `<tr><td colspan="2">${formatTitle(key)} ${renderObject(value)}</td></tr>`;
    } else if (Array.isArray(value)) {
      html += `<tr><td colspan="2">${formatTitle(key)} ${renderArray(value)}</td></tr>`;
    } else {
      const isNumber = typeof value === 'number' && !isNaN(value);
      const isMoney = /amount|income|salary|value|total|deduction|tax|payable|liability/i.test(key);
      const formattedValue = isMoney && isNumber ? `₹ ${value.toLocaleString('en-IN')}` : value;
      html += `<tr><td>${formatTitle(key)}</td><td style="text-align:right">${formattedValue}</td></tr>`;
    }
  }

  html += '</tbody></table></section>';
  return html;
}

// Render array as table
function renderArray(arr) {
  if (!arr.length) return '<p>(No data)</p>';
  const keys = Object.keys(arr[0] || {});
  let html = '<table class="section-table" border="1"><thead><tr>';
  keys.forEach(key => html += `<th>${formatTitle(key)}</th>`);
  html += '</tr></thead><tbody>';
  arr.forEach(row => {
    html += '<tr>';
    keys.forEach(key => html += `<td>${row[key] ?? ''}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// Format title strings
function formatTitle(text) {
  return text.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()).trim();
}

// PDF Generation
function generatePDF() {
  const report = document.getElementById('reportContent');
  if (!report) return alert("No report found. Upload JSON first.");
  html2pdf().set({
    margin: 0.5,
    filename: 'ITR_Computation_Report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(report).save();
}
