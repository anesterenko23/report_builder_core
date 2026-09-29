import { normalizePm, number, pick } from '../utils/fields.js';

const DISPUTE_PM_FIELDS = ['Order ID', 'order_id', 'transaction_identifier', 'PM ID', 'pm_id', 'Transaction ID'];
const TX_PM_FIELDS = ['transaction_identifier', 'Order ID', 'order_id', 'PM ID', 'pm_id', 'identifier'];

export function normalizeDispute(row, index) {
  const pm = normalizePm(pick(row, DISPUTE_PM_FIELDS));
  return {
    _sourceIndex: index + 2,
    pm,
    provider: pick(row, ['Provider', 'provider', 'PSP', 'psp', 'Acquirer', 'acquirer']),
    providerDisputeAmount: number(pick(row, ['Original dispute amount', 'Dispute Amount', 'dispute_amount', 'Amount', 'amount'])),
    providerCurrency: pick(row, ['Dispute Currency', 'dispute_currency', 'Currency', 'currency']),
    reason: pick(row, ['Reason', 'reason', 'Reason description', 'reason_description']),
    reasonCode: pick(row, ['Reason code', 'reason_code', 'Code', 'code']),
    raw: row
  };
}

export function normalizeTransaction(row, index) {
  const pm = normalizePm(pick(row, TX_PM_FIELDS));
  return {
    _sourceIndex: index + 2,
    pm,
    amount: number(pick(row, ['amount', 'Amount', 'transaction_amount', 'Сумма транзакций (EUR)', 'amount_eur'])),
    currency: pick(row, ['currency', 'Currency', 'transaction_currency']),
    projectName: pick(row, ['project_name', 'Project Name', 'projectName']),
    projectIdentifier: pick(row, ['project_identifier', 'Project', 'project']),
    merchantIdentifier: pick(row, ['merchant_identifier', 'Merchant', 'merchant']),
    merchantId: pick(row, ['merchant_id', 'Merchant ID']),
    customerId: pick(row, ['customer_id', 'client_id', 'Customer ID', 'user_id']),
    email: pick(row, ['email', 'Email', 'customer_email']),
    firstName: pick(row, ['first_name', 'First Name', 'name']),
    lastName: pick(row, ['last_name', 'Last Name', 'surname']),
    country: pick(row, ['country', 'Country', 'customer_country']),
    cardCountry: pick(row, ['card_country', 'Card Country', 'bin_country']),
    pan: pick(row, ['pan', 'PAN', 'card_mask', 'Card number']),
    panId: pick(row, ['pan_id', 'PAN ID', 'card_id']),
    status: pick(row, ['status', 'Status', 'transaction_status']),
    createdAt: pick(row, ['created_at', 'Created At', 'transaction_created_at', 'date']),
    raw: row
  };
}
