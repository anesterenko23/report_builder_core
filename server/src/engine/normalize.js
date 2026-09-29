import { normalizePm, number, pick } from '../utils/fields.js';

const DISPUTE_PM_FIELDS = ['Order ID (PM)', 'Order ID', 'order_id', 'transaction_identifier', 'PM ID', 'pm_id', 'Transaction ID'];
const TX_PM_FIELDS = ['transaction_identifier', 'Order ID (PM)', 'Order ID', 'order_id', 'PM ID', 'pm_id', 'identifier'];
const clean = value => value === undefined || value === null || String(value).trim() === '' ? null : value;
const lower = value => clean(value) ? String(value).trim().toLowerCase() : null;

export function normalizeDispute(row, index) {
  return {
    _sourceIndex: index + 2,
    pm: normalizePm(pick(row, DISPUTE_PM_FIELDS)),
    provider: clean(pick(row, ['Провайдер', 'Provider', 'provider', 'PSP', 'psp'])),
    disputeDate: clean(pick(row, ['Дата подачи диспута', 'Dispute date', 'dispute_date'])),
    providerDisputeAmount: number(pick(row, ['Сумма диспута', 'Original dispute amount', 'Dispute Amount', 'dispute_amount'])),
    providerCurrency: clean(pick(row, ['Валюта диспута', 'Dispute Currency', 'dispute_currency'])),
    providerTransactionAmount: number(pick(row, ['Сумма транзакции', 'Original amount', 'Transaction amount'])),
    providerTransactionCurrency: clean(pick(row, ['Валюта транзакции', 'Transaction currency'])),
    reason: clean(pick(row, ['Причина', 'Reason', 'reason', 'Reason description', 'reason_description'])),
    reasonCode: clean(pick(row, ['Код причины', 'Reason code', 'reason_code', 'Code', 'code'])),
    providerCustomerName: clean(pick(row, ['Customer name', 'Customer Name'])),
    providerCustomerEmail: lower(pick(row, ['Customer email', 'Customer Email'])),
    providerCustomerId: clean(pick(row, ['Customer ID', 'customer_id'])),
    providerBillingCountry: clean(pick(row, ['Billing country', 'Billing Country'])),
    providerCardCountry: clean(pick(row, ['Card country', 'Card Country'])),
    providerCard: clean(pick(row, ['Карта', 'Card', 'Card mask'])),
    raw: row
  };
}

export function normalizeTransaction(row, index) {
  return {
    _sourceIndex: index + 2,
    pm: normalizePm(pick(row, TX_PM_FIELDS)),
    reference: clean(pick(row, ['reference', 'Reference', 'Референс'])),
    creationDate: clean(pick(row, ['creation_date', 'created_at', 'Created At', 'transaction_created_at', 'date'])),
    amount: number(pick(row, ['amount', 'Amount', 'transaction_amount', 'Сумма транзакций (EUR)', 'amount_eur'])),
    currency: clean(pick(row, ['currency', 'Currency', 'transaction_currency'])),
    projectName: clean(pick(row, ['project_name', 'Project Name', 'projectName'])),
    projectIdentifier: clean(pick(row, ['project_identifier', 'Project', 'project'])),
    merchantName: clean(pick(row, ['merchant_name', 'Merchant Name', 'merchant'])),
    merchantIdentifier: clean(pick(row, ['merchant_identifier', 'Merchant identifier'])),
    merchantId: clean(pick(row, ['merchant_id', 'Merchant ID'])),
    midName: clean(pick(row, ['mid_name', 'MID Name', 'mid_identifier', 'MID'])),
    method: clean(pick(row, ['method', 'Method'])),
    customerId: clean(pick(row, ['customer_id', 'client_id', 'Customer ID', 'user_id'])),
    email: lower(pick(row, ['customer_email', 'email', 'Email'])),
    firstName: clean(pick(row, ['customer_first_name', 'first_name', 'First Name', 'name'])),
    middleName: clean(pick(row, ['customer_middle_name', 'middle_name'])),
    lastName: clean(pick(row, ['customer_last_name', 'last_name', 'Last Name', 'surname'])),
    country: clean(pick(row, ['customer_country', 'country', 'Country'])),
    cardCountry: clean(pick(row, ['card_country', 'Card Country', 'bin_country'])),
    pan: clean(pick(row, ['card_mask', 'pan', 'PAN', 'Card number'])),
    panId: clean(pick(row, ['pan_id', 'PAN ID', 'card_id'])),
    cardHolder: clean(pick(row, ['card_holder', 'Card holder', 'cardholder'])),
    cardBrand: clean(pick(row, ['card_brand', 'Card brand'])),
    cardType: clean(pick(row, ['card_type', 'Card type'])),
    cardBankName: clean(pick(row, ['card_bank_name', 'Issuer', 'Bank issuer'])),
    status: clean(pick(row, ['status', 'Status', 'transaction_status'])),
    bankName: clean(pick(row, ['bank_name', 'Bank name'])),
    raw: row
  };
}
