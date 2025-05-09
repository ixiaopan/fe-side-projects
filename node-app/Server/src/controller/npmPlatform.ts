import mongoose from 'mongoose'

import { RESPONSE_ENUM } from '../enum/httpEnum'
import { execAsync } from '../util/execAsync'
import { gitCheckout, IPackage, uploadToOss } from '../util/package'
import {
  gitClone,
  findPackage,
  calcVersion,
  npmLogin,
  npmPublish,
  getRealPublishDirname,
  getTempDirname,
  getTempDirAbsolutePath,
} from '../util/package'
import GitlabService from './gitlab'
import logger from '../util/log'
import { ENV_ENUM } from '../enum/envEnum'
import { NPM_REGISTRY } from '../config/package'
import path from 'path'

const fs = require('fs-extra')

const isMock = process.env.NODE_ENV == ENV_ENUM.MOCK

const PackagesSchema = new mongoose.Schema(
  {
    name: String,
    gitlab: String,
    projectId: Number,
    maintainer: [
      {
        userId: String,
        name: String,
      },
    ],
    publishDirname: String, // 包构建产物的目录一般是 dist/
    isMonorepo: Boolean, // 是否多包管理模式
    packageList: [
      // IPackage，多包管理下的子包；如果是单包，就是自己
      {
        filePath: String,
        dirname: String,
        name: String,
        version: String,
        ossFilename: String,
        publishDirname: String,
      },
    ],
    ossFilename: String,
  },
  {
    timestamps: true,
  }
)
const PackagesModel = mongoose.model('packages', PackagesSchema)

// 发布记录
const PublishRecordSchema = new mongoose.Schema({
  package_name: String,
  subModule: String,
  branch_name: String,
  tag: String,
  bump_type: String,
  version: String,
  status: String,
  publish_user: String,
  publish_time: Date,
  oss_url: String,
})
const PublishRecordModel = mongoose.model('publishRecord', PublishRecordSchema)

class NpmPlatformController {
  prefix = '/npmPlatform'

  // 添加包
  async addPackage(ctx: any) {
    const { id, name, gitlab, maintainer, projectId, publishDirname, isMonorepo, ossFilename, monorepoList } =
      ctx.request?.body || {}

    let tempDirAbsolutePath

    // 更新
    if (id) {
      try {
        // clone代码
        const tempDirname = getTempDirname()
        tempDirAbsolutePath = getTempDirAbsolutePath(tempDirname)
        await gitClone({
          branch: 'main',
          gitlab,
          position: tempDirAbsolutePath,
        })

        // 查找包的package.json
        const packageList: IPackage[] = await findPackage({
          rootDir: tempDirAbsolutePath,
          packageName: name,
          isMonorepo,
        })
        await PackagesModel.findByIdAndUpdate(id, {
          packageList,
        })

        ctx.body = {
          code: RESPONSE_ENUM.SUCCESS,
          msg: 'success',
        }
      } catch (e) {
      } finally {
        fs.removeSync(tempDirAbsolutePath)
      }
      return
    }

    try {
      // 是否已经存在且不是用来更新
      const isExisting = await PackagesModel.findOne({ name })
      if (isExisting) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: '此包已经存在!',
        })
      }

      // clone代码
      const tempDirname = getTempDirname()
      tempDirAbsolutePath = getTempDirAbsolutePath(tempDirname)
      await gitClone({
        branch: 'main',
        gitlab,
        position: tempDirAbsolutePath,
      })

      // 查找包的package.json
      let packageList: IPackage[] = await findPackage({
        rootDir: tempDirAbsolutePath,
        packageName: name,
        isMonorepo,
      })

      // 如果是monorepo，需要赋值其他参数
      if (monorepoList && monorepoList.length > 0) {
        packageList = packageList.map((pkg) => {
          const currentPackage = monorepoList.find((mono) => mono.name === pkg.name)
          if (currentPackage) {
            pkg.publishDirname = currentPackage.publishDirname || ''
            pkg.ossFilename = currentPackage.ossFilename || ''
          }
          return pkg
        })
      }

      const doc = await PackagesModel.create({
        name,
        gitlab,
        maintainer,
        projectId,
        publishDirname,
        packageList,
        isMonorepo,
        ossFilename,
      })

      fs.removeSync(tempDirAbsolutePath)

      if (!doc) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: 'addPackage failed',
        })
      }

      ctx.body = {
        code: RESPONSE_ENUM.SUCCESS,
        msg: 'success',
      }
    } catch (err) {
      logger.info('addPackage error', err)

      fs.removeSync(tempDirAbsolutePath)

      ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'fail',
      }
    }
  }

  async removePackage(ctx: any) {
    const { id } = ctx.request?.body || {}

    await PackagesModel.findByIdAndRemove(id)

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
    }
  }

  // 查询包列表
  async queryPackages(ctx: any) {
    const docs = await PackagesModel.find()
    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: docs,
    }
  }

  // 包详情
  async queryPackageDetail(ctx: any) {
    const { id } = ctx.request.query || {}

    const data = await PackagesModel.findById(id)

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }

  // 设置包的maintainer
  async setPackageMaintainer(ctx: any) {
    const { id, maintainer } = ctx.request.body || {}

    const doc = await PackagesModel.findByIdAndUpdate(id, { maintainer })
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '设置包的maintainer失败!',
      })
    }

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
    }
  }

  // 发布包
  async publishPackage(ctx: any) {
    const {
      id,
      branch,
      tag,
      bumpType,
      isMonorepo,
      subModule,
    }: {
      id: string
      branch: string
      isMonorepo: boolean
      tag: string
      bumpType: string
      publishUserId: string
      subModule: string
    } = ctx.request?.body || {}

    if (isMonorepo && !subModule) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '请选择一个子包',
      })
    }

    // 只能发线上、测试
    if (tag != 'latest' && tag != 'beta') {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: 'tag is invalid',
      })
    }

    // 找到要发的
    const doc = await PackagesModel.findById(id)
    if (!doc) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '没有此npm包',
      })
    }

    // 先校验权限
    if (tag == 'latest' && !doc.maintainer.find((c) => c.userId == ctx.state.user.userId)) {
      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: '你不是此npm包的maintainer，无权限发布latest',
      })
    }

    let tempDirAbsolutePath
    try {
      // clone main 代码
      logger.info('git clone main开始')
      const tempDirname = getTempDirname()
      tempDirAbsolutePath = getTempDirAbsolutePath(tempDirname)
      await gitClone({
        branch: 'main',
        gitlab: doc.gitlab,
        position: tempDirAbsolutePath,
      })

      // 查找待发布包的package.json
      logger.info(`monorepo ${isMonorepo},开始查找 ${isMonorepo ? subModule : doc.name}的package.json`)
      const mainPackageList = await findPackage({
        rootDir: tempDirAbsolutePath,
        packageName: doc.name, // 单包用这个
        isMonorepo,
      })
      const realPackage = mainPackageList.find((p) => p.name == (isMonorepo ? subModule : doc.name))
      if (!realPackage) {
        return (ctx.body = {
          code: RESPONSE_ENUM.FAIL,
          msg: `git上没有${realPackage.name}`,
        })
      }

      // 获取version
      let packageObj = fs.readJsonSync(realPackage.filePath)
      logger.info(`${realPackage.name}当前version`, packageObj.version)
      const mainVersion = packageObj.version

      if (tag == 'beta') {
        // 切到测试分支
        await gitCheckout(tempDirAbsolutePath, branch)

        logger.info(`now in ${branch}`)

        packageObj = fs.readJsonSync(realPackage.filePath)
      }

      const version = calcVersion({ version: mainVersion, bumpType, tag })
      packageObj.version = version

      fs.writeFileSync(realPackage.filePath, JSON.stringify(packageObj, null, 2))
      logger.info(`${realPackage.name}修改后version`, version)

      if (!isMock) {
        logger.info(`git add && git commit in ${tempDirAbsolutePath}`)
        await execAsync(`cd ${tempDirAbsolutePath} && git add . && git commit -m 'chore: upgrade version'`, [], {
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
        })

        //
        logger.info('npm login & build & publish...')
        await npmLogin()
        await execAsync(`npm whoami --registry ${NPM_REGISTRY}`, [], {
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
        })
      }

      const cmd = isMonorepo ? `:${subModule.replace(/@\w+\//, '')}` : ''
      logger.info('pnpm i & pnpm build', cmd, `in ${tempDirAbsolutePath}`)
      await execAsync(`cd ${tempDirAbsolutePath} && pnpm i && pnpm build${cmd}`, [], {
        stdio: isMock ? 'inherit' : 'ignore',
        cwd: process.cwd(),
        shell: true,
      })

      let currentMono = null
      if (isMonorepo) {
        currentMono = doc.packageList.find((pkg) => pkg.name === subModule)
      }

      const publishDirname = isMonorepo ? currentMono?.publishDirname : doc.publishDirname
      const realPublishDirname = getRealPublishDirname({
        publishDirname, // 自定义发布产物路径，高优先级
        rootDirname: tempDirAbsolutePath,
        packageDirname: realPackage.dirname,
      })
      logger.info('npm publish in', realPublishDirname)
      if (!isMock) {
        await npmPublish({ dirname: realPublishDirname, tag })
      }

      logger.info('update database...')
      // oss
      const ossFilename = isMonorepo ? currentMono?.ossFilename : doc.ossFilename
      let ossUrl = ''
      if (ossFilename) {
        const ossFilePath = path.join(tempDirAbsolutePath, ossFilename)
        ossUrl = await uploadToOss({
          ossFilePath,
          version,
        })
        if (tag == 'latest') {
          ossUrl +=
            ',' +
            (await uploadToOss({
              ossFilePath,
              version: '',
            }))
        }
      }
      if (tag == 'latest') {
        // git push && tag only
        if (!isMock) {
          logger.info('git push & git tag...')
          await execAsync(
            `cd ${tempDirAbsolutePath} && git tag v${version} && git push && git push origin v${version}`,
            [],
            {
              stdio: 'inherit',
              cwd: process.cwd(),
              shell: true,
            }
          )
          fs.removeSync(tempDirAbsolutePath)
        }
        await PackagesModel.updateOne(
          { _id: id },
          { $set: { 'packageList.$[pkg].version': version } },
          { arrayFilters: [{ 'pkg.name': realPackage.name }] }
        )
      }
      // 插入发布记录中
      await PublishRecordModel.create({
        package_name: doc.name,
        subModule: isMonorepo ? realPackage.name : '',
        branch_name: branch,
        tag,
        bump_type: bumpType,
        version,
        status: 'success',
        publish_user: ctx.state.user?.name,
        publish_time: Date.now(),
        oss_url: ossUrl,
      })

      if (isMock) {
        const list = await findPackage({
          rootDir: tempDirAbsolutePath,
          packageName: doc.name,
          isMonorepo,
        })
        console.log('file list', list)
      }
    } catch (e) {
      logger.error('publish', e)

      tempDirAbsolutePath && fs.removeSync(tempDirAbsolutePath)

      return (ctx.body = {
        code: RESPONSE_ENUM.FAIL,
        msg: e.message || 'fail',
      })
    }
  }

  // 包的发布记录
  async queryPublishRecords(ctx: any) {
    const { id } = ctx.request.query || {}

    const res = await PackagesModel.findById(id)

    const data = await PublishRecordModel.find({ package_name: res.name }).sort({ publish_time: -1 })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data,
    }
  }

  // 查询包的changelog
  async queryChangelog(ctx: any) {
    const { projectId } = ctx.request.query || {}

    const allTags = await GitlabService.queryTags({ projectId })
    const allMergeRequests = await GitlabService.queryMergeRequests({ projectId })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: {
        allTags,
        allMergeRequests,
      },
    }
  }
  // 获取所有分支
  async queryAllBranches(ctx: any) {
    const { projectId } = ctx.request.query || {}

    const allBranches = await GitlabService.queryAllBranches({ projectId })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: allBranches,
    }
  }
  // 获取monorepo
  async queryMonorepo(ctx: any) {
    const { gitlab } = ctx.request.query || {}

    const tempDirname = getTempDirname()
    const tempDirAbsolutePath = getTempDirAbsolutePath(tempDirname)
    await gitClone({
      branch: 'main',
      gitlab,
      position: tempDirAbsolutePath,
    })

    // 查找包的package.json
    const packageList: IPackage[] = await findPackage({
      rootDir: tempDirAbsolutePath,
      packageName: '',
      isMonorepo: true,
    })

    ctx.body = {
      code: RESPONSE_ENUM.SUCCESS,
      msg: 'success',
      data: packageList,
    }
  }
}

const modelIns = new NpmPlatformController()

export function setupNpmPlatformRouter(router: any) {
  router.post(`${modelIns.prefix}/addPackage`, modelIns.addPackage)
  router.post(`${modelIns.prefix}/removePackage`, modelIns.removePackage)
  router.get(`${modelIns.prefix}/queryPackages`, modelIns.queryPackages)
  router.get(`${modelIns.prefix}/queryPackageDetail`, modelIns.queryPackageDetail)
  router.post(`${modelIns.prefix}/setPackageMaintainer`, modelIns.setPackageMaintainer)
  router.post(`${modelIns.prefix}/publishPackage`, modelIns.publishPackage)
  router.get(`${modelIns.prefix}/queryPublishRecords`, modelIns.queryPublishRecords)
  router.get(`${modelIns.prefix}/queryChangelog`, modelIns.queryChangelog)
  router.get(`${modelIns.prefix}/queryAllBranches`, modelIns.queryAllBranches)
  router.get(`${modelIns.prefix}/queryMonorepo`, modelIns.queryMonorepo)
}
