import { ServiceType } from '../models'

const catalog = [
  ['BA01','基本身體清潔',260],['BA02','基本日常照顧',195],['BA03','測量生命徵象',35],['BA04','協助進食或管灌餵食',130],['BA05','餐食照顧',310],['BA07','協助沐浴及洗頭',325],['BA10','翻身拍背',155],['BA11','肢體關節活動',195],['BA12','協助上（下）樓梯',130],['BA13','陪同外出',195],['BA14','陪同就醫',685],['BA15-1','家務協助（自用）',195],['BA16-1','代購、代領或代送服務（自用）',130],['BA18','安全看視',200],['BA20','陪伴服務',175],['BA22','巡視服務',130],['BA23','協助洗頭',200],['BA24','協助排泄',220],['GA09','居家喘息服務（2 小時）',770],
] as const

/** 啟動時補齊官方服務型錄；既有項目由管理員維護，不在此覆蓋。 */
export async function ensureServiceCatalog(): Promise<void> {
  await ServiceType.bulkWrite(catalog.map(([code,name,basePrice]) => ({ updateOne: {
    filter: { code }, update: { $setOnInsert: { code,name,basePrice,durationMinutes: code === 'GA09' ? 120 : 30,active:true } }, upsert:true,
  }})))
}
