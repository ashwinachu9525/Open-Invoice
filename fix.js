const fs = require('fs');
let c = fs.readFileSync('src/components/forms/quotation-form.tsx', 'utf8');

// remove useEffect for bank accounts
c = c.replace(/useEffect\(\(\) => \{\n    if \(initialData\) return \/\/ Do not override if editing\n    const defaultAccount = bankAccounts\.find\(a => a\.isDefault\)\n    if \(defaultAccount\) \{\n      form\.setValue\("bankName", defaultAccount\.bankName\)\n      form\.setValue\("bankAccountName", defaultAccount\.accountName\)\n      form\.setValue\("bankAccountNumber", defaultAccount\.accountNumber\)\n      form\.setValue\("bankIfscCode", defaultAccount\.ifscCode\)\n      if \(defaultAccount\.accountType\) form\.setValue\("bankAccountType", defaultAccount\.accountType\)\n    \}\n  \}, \[bankAccounts, form, initialData\]\)/g, '');

// remove bank details UI section
const bankSectionStart = c.indexOf('{/* ── Section: Customization & Details ── */}');
const customizationStart = c.indexOf('{/* ── Section: Customization ── */}');
if(bankSectionStart !== -1 && customizationStart !== -1) {
    c = c.substring(0, bankSectionStart) + c.substring(customizationStart);
}

// remove bank parameters
c = c.replace(/bankAccounts = \[\]/g, '');
c = c.replace(/bankAccounts\?: BankAccount\[\]/g, '');

fs.writeFileSync('src/components/forms/quotation-form.tsx', c);
