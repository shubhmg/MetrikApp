import * as memberService from './member.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const list = catchAsync(async (req, res) => {
  const members = await memberService.listMembers(req.businessId);
  res.json({ success: true, data: { members } });
});

export const getById = catchAsync(async (req, res) => {
  const member = await memberService.getMember(req.params.id, req.businessId);
  res.json({ success: true, data: { member } });
});

export const create = catchAsync(async (req, res) => {
  const member = await memberService.createMember(req.body, req.businessId, req.user._id.toString());
  res.status(201).json({ success: true, data: { member } });
});

export const update = catchAsync(async (req, res) => {
  const member = await memberService.updateMember(
    req.params.id, req.body, req.businessId, req.user._id.toString()
  );
  res.json({ success: true, data: { member } });
});

export const remove = catchAsync(async (req, res) => {
  const result = await memberService.removeMember(
    req.params.id, req.businessId, req.user._id.toString()
  );
  res.json({ success: true, ...result });
});
