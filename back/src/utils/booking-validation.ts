import * as yup from 'yup'

const objectId = yup.string().matches(/^[a-f\d]{24}$/i, '資料 ID 格式錯誤')

export const bookingCreateSchema = yup.object({
  availabilityId: yup.string().matches(/^[a-f\d]{24}\|\d{4}-\d{2}-\d{2}\|\d{2}:\d{2}\|\d{2}:\d{2}$/i, '服務時段格式錯誤').required('請選擇服務時段'),
  recipientId: objectId.optional(),
  serviceTypeIds: yup.array(objectId.required()).min(1, '請選擇至少一項服務').max(20).required(),
  serviceAddress: yup.object({
    text: yup.string().trim().max(300).required('請填寫服務地址'),
    latitude: yup.number().min(-90).max(90).optional(),
    longitude: yup.number().min(-180).max(180).optional(),
  }).noUnknown().required(),
  specialRequirements: yup.string().trim().max(2000).optional(),
}).noUnknown()

export const bookingRescheduleSchema = yup.object({
  date: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, '服務日期格式錯誤').required(),
  startTime: yup.string().matches(/^\d{2}:\d{2}$/, '開始時間格式錯誤').required(),
  endTime: yup.string().matches(/^\d{2}:\d{2}$/, '結束時間格式錯誤').required(),
}).noUnknown()
