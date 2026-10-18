export const leadStatusColors = {
  new:         'bg-blue-100 text-blue-800',
  contacted:   'bg-yellow-100 text-yellow-800',
  qualified:   'bg-green-100 text-green-800',
  unqualified: 'bg-red-100 text-red-800',
  converted:   'bg-purple-100 text-purple-800',
}

export const dealStageColors = {
  prospect:      'bg-gray-100 text-gray-800',
  proposal:      'bg-blue-100 text-blue-800',
  negotiation:   'bg-yellow-100 text-yellow-800',
  'closed-won':  'bg-green-100 text-green-800',
  'closed-lost': 'bg-red-100 text-red-800',
}

export const followupStatusColors = {
  pending:   'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export const LEAD_TRANSITIONS = {
  new:         ['contacted'],
  contacted:   ['qualified', 'unqualified'],
  qualified:   ['converted', 'unqualified'],
  unqualified: ['new'],
  converted:   [],
}

export const DEAL_TRANSITIONS = {
  prospect:      ['proposal'],
  proposal:      ['negotiation', 'closed-won', 'closed-lost'],
  negotiation:   ['closed-won', 'closed-lost'],
  'closed-won':  [],
  'closed-lost': ['prospect'],
}
