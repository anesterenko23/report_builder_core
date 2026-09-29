import { normalizePm, number, pick } from '../utils/fields.js';

const DISPUTE_PM_FIELDS = ['Order ID (PM)', 'Order ID', 'order_id', 'transaction_identifier', 'PM ID', 'pm_id', 'Transaction ID'];
const TX_PM_FIELDS = ['transaction_identifier', 'Order ID (PM)', 'Order ID', 'order_id', 'PM ID', 'pm_id', 'identifier'];

export function normalizeDispute(row, index) {
  return {
    _sourceIndex: index + 2,
    pm: normalizePm(pick(row, DISPUTE_PM_FIELDS)),
    provider: pick(row, ['Провайдер', 'Provider', 'provider', 'PSP', 'psp']),
    disputeDate: pick(row, ['Дата подачи диспута', 'Dispute date', 'dispute_date']),
    providerDisputeAmount: number(pick(row, ['Сумма диспута', 'Original dispute amount', 'Dispute Amount', 'dispute_amount'])),
    providerCurrency: pick(row, ['Валюта диспута', 'Dispute Currency', 'dispute_currency']),
    providerTransactionAmount: number(pick(row, ['Сумма транзакции', 'Original amount', 'transaction_amount'])),
    providerTransactionCurrency: pick(row, ['Валюта транзакции', 'Transaction Currency', 'transaction_currency']),
    reason: pick(row, ['Причина', 'Reason', 'reason', 'Reason description']),
    reasonCode: pick(row, ['Код причины', 'Reason code', 'reason_code']),
    customerName: pick(row, ['Customer name', 'customer_name']),
    customerEmail: pick(row, ['Customer email', 'customer_email']),
    customerId: pick(row, ['Customer ID', 'customer_id']),
    billingCountry: pick(row, ['Billing country', 'billing_country']),
    cardCountry: pick(row, ['Card country', 'card_country']),
    card: pick(row, ['Карта', 'Card', 'card']),
    raw: row
  };
}

export function normalizeTransaction(row, index) {
  return {
    _sourceIndex: index + 2,
    pm: normalizePm(pick(row, TX_PM_FIELDS)),
    reference: pick(row, ['reference', 'Reference']),
    amount: number(pick(row, ['amount', 'Amount', 'transaction_amount', 'Сумма транзакций (EUR)', 'amount_eur'])),
    currency: pick(row, ['currency', 'Currency', 'transaction_currency']),
    projectName: pick(row, ['project_name', 'Project Name', 'projectName']),
    projectIdentifier: pick(row, ['project_identifier', 'Project', 'project']),
    merchantIdentifier: pick(row, ['merchant_identifier', 'Merchant', 'merchant']),
    merchantName: pick(row, ['merchant_name', 'Merchant Name', 'merchantName']),
    merchantId: pick(row, ['merchant_id', 'Merchant ID']),
    midName: pick(row, ['mid_name', 'MID', 'mid_identifier']),
    method: pick(row, ['method', 'Method']),
    customerId: pick(row, ['customer_id', 'client_id', 'Customer ID', 'user_id']),
    email: pick(row, ['customer_email', 'email', 'Email']),
    firstName: pick(row, ['customer_first_name', 'first_name', 'First Name', 'name']),
    lastName: pick(row, ['customer_last_name', 'last_name', 'Last Name', 'surname']),
    country: pick(row, ['customer_country', 'country', 'Country']),
    cardCountry: pick(row, ['card_country', 'Card Country', 'bin_country']),
    pan: pick(row, ['card_mask', 'pan', 'PAN', 'Card number']),
    panId: pick(row, ['pan_id', 'PAN ID']),
    cardHolder: pick(row, ['card_holder', 'Card Holder']),
    cardBrand: pick(row, ['card_brand', 'Card Brand']),
    cardType: pick(row, ['card_type', 'Card Type']),
    cardBankName: pick(row, ['card_bank_name', 'Issuer Bank']),
    status: pick(row, ['status', 'Status', 'transaction_status']),
    createdAt: pick(row, ['creation_date', 'created_at', 'Created At', 'transaction_created_at', 'date']),
    raw: row
  };
}
