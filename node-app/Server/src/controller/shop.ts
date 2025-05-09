import mongoose from 'mongoose'
import dayjs from 'dayjs'

import { RESPONSE_ENUM } from '../enum/httpEnum'
import { omit } from '../util'

const ShopProductSchema = new mongoose.Schema({
  name: String,
  price: Number, // 售价
  unitPrice: Number, // 零售价
  spec: String,
  category: String,
  categoryId: String,
  brand: String,
  stockQuantity: Number,
  active: Boolean,
})
const ProductModel = mongoose.model('ShopProduct', ShopProductSchema)

const ShopPurchaseSchema = new mongoose.Schema({
  name: String,
  productId: String,
  purchasePrice: Number,
  unitPurchasePrice: Number,
  purchaseQuantity: Number,
  purchaseDate: String,
})
const PurchaseModel = mongoose.model('ShopPurchase', ShopPurchaseSchema)

class ShopController {
  prefix = '/shop'

  async createProduct(ctx: any) {
    const {
      name,
      price, purchasePrice, unitPurchasePrice, unitPrice,
      category,
      categoryId,
      brand, spec,
      stockQuantity,
    } = ctx.request?.body || {}

    const doc = await ProductModel.create({
      name,
      price, purchasePrice, unitPurchasePrice, unitPrice,
      category,
      categoryId,
      brand, spec,
      stockQuantity,
      active: true,
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'create product failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  async updateProduct(ctx: any) {
    const {
      id,
      name,
      price, purchasePrice, unitPurchasePrice, unitPrice,
      category, categoryId,
      brand, spec,
      stockQuantity,
    } = ctx.request?.body || {}

    const doc = await ProductModel.findByIdAndUpdate(id, {
      name,
      price, purchasePrice, unitPurchasePrice, unitPrice,
      category,
      categoryId,
      brand, spec,
      stockQuantity,
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'update product failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  async getProductList(ctx) {
    const doc = await ProductModel.find()
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc.map((c) => ({ ...omit(c.toObject(), ['_id', '__v']), id: c._id })),
    }
  }

  async createPurchase(ctx: any) {
    const {
      name,
      productId,
      purchaseDate,
      purchasePrice,
      unitPurchasePrice,
      purchaseQuantity,
    } = ctx.request?.body || {}

    const doc = await PurchaseModel.create({
      name,
      productId,
      purchaseDate,
      purchasePrice,
      unitPurchasePrice,
      purchaseQuantity,
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'create product failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  async updatePurchase(ctx: any) {
    const {
      id,
      name,
      productId,
      purchaseDate,
      purchasePrice,
      unitPurchasePrice,
      purchaseQuantity,
    } = ctx.request?.body || {}

    const doc = await PurchaseModel.findByIdAndUpdate(id, {
      name,
      productId,
      purchaseDate,
      purchasePrice,
      unitPurchasePrice,
      purchaseQuantity
    })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'update product failed',
      })
    }
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: true,
    }
  }
  async getPurchaseList(ctx) {
    const doc = await PurchaseModel.find().sort({ purchaseDate: -1 })
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc.map((c) => ({ ...omit(c.toObject(), ['_id', '__v']), id: c._id })),
    }
  }
  async getLatestPurchaseList(ctx) {
    const doc = await PurchaseModel.aggregate([
      {
        $sort: {
          purchaseDate: -1,
        }
      },
      {
       $group: {
        _id: '$productId',
        doc: { $first: '$$ROOT'}
       }
      },

      { $replaceRoot: { newRoot: "$doc" } },
      {
        $project: {
          productId: 1,
          purchaseDate: 1,
          purchasePrice: 1,
          unitPurchasePrice: 1,
          _id: 0,
        },
      },
    ])

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: doc,
    }
  }
}

const modelIns = new ShopController()
export function setupShopRouter(router: any) {
  router.post(`${modelIns.prefix}/createProduct`, modelIns.createProduct)
  router.post(`${modelIns.prefix}/updateProduct`, modelIns.updateProduct)
  router.get(`${modelIns.prefix}/queryProductList`, modelIns.getProductList)

  router.post(`${modelIns.prefix}/createPurchase`, modelIns.createPurchase)
  router.post(`${modelIns.prefix}/updatePurchase`, modelIns.updatePurchase)
  router.get(`${modelIns.prefix}/queryPurchaseList`, modelIns.getPurchaseList)
  router.get(`${modelIns.prefix}/getLatestPurchaseList`, modelIns.getLatestPurchaseList)
}
