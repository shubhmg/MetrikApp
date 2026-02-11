import * as partyService from './party.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const party = await partyService.createParty(req.body, req.businessId, req.user._id);
  res.status(201).json({ success: true, data: { party } });
});

export const list = catchAsync(async (req, res) => {
  const parties = await partyService.listParties(req.businessId, req.query);
  res.json({ success: true, data: { parties } });
});

export const getById = catchAsync(async (req, res) => {
  const party = await partyService.getPartyById(req.params.id, req.businessId);
  res.json({ success: true, data: { party } });
});

export const getLedger = catchAsync(async (req, res) => {
  const ledger = await partyService.getPartyLedger(req.params.id, req.businessId, req.query, {
    userId: req.user._id,
    role: req.businessRole,
  });
  res.json({ success: true, data: ledger });
});

export const update = catchAsync(async (req, res) => {
  const party = await partyService.updateParty(req.params.id, req.body, req.businessId, req.user._id);
  res.json({ success: true, data: { party } });
});

export const remove = catchAsync(async (req, res) => {
  await partyService.deleteParty(req.params.id, req.businessId, req.user._id);
  res.json({ success: true, message: 'Party deleted' });
});
