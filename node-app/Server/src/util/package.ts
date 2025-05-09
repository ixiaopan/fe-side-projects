import { glob } from 'glob'
import path from 'path'
import fs from 'fs-extra'

import { execAsync } from './execAsync'
import { NPM_USER_NAME, NPM_USER_PASSWORD, NPM_USER_EMAIL, NPM_REGISTRY } from '../config/package'

const fs = require('fs-extra')
const semver = require('semver')
const npmCliLogin = require('npm-cli-login')

enum TAG {
  LATEAT = 'latest',
  BETA = 'beta',
}

export interface IPackage {
  filePath: string
  dirname: string
  name: string
  version: string
  private?: boolean
  publishDirname?: string
  ossFilename?: string
}

const gitClone = async ({ branch, gitlab, position }) => {
  await execAsync(`git clone -b ${branch} ${gitlab} ${position}`, [], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  })
}
const gitCheckout = async (dir, branch) => {
  await execAsync(`cd ${dir} && git pull && git checkout ${branch}`, [], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  })
}

const findPackage = ({ rootDir, packageName, isMonorepo }): Promise<IPackage[]> => {
  return new Promise((resolve) => {
    const packagePath = isMonorepo ? 'packages/**/package.json' : '**/package.json'

    const promise = glob(packagePath, {
      ignore: ['node_modules/**', '**/node_modules/**'],
      cwd: rootDir,
    })

    const packageList = []
    promise.then((paths) => {
      paths.forEach((pathStr) => {
        const filePath = path.join(rootDir, pathStr)
        const packageObj: IPackage = fs.readJsonSync(filePath)

        if (isMonorepo) {
          if (!packageObj.private) {
            packageList.push({
              filePath,
              dirname: path.dirname(filePath),
              name: packageObj.name,
              version: packageObj.version,
            })
          }
        }
        // 单包也可以是monorepo的形式这种就会存在多个pkg.json，所以需要匹配
        else if (packageObj.name === packageName) {
          packageList.push({
            filePath,
            dirname: path.dirname(filePath),
            name: packageObj.name,
            version: packageObj.version,
          })
        }
      })
      resolve(packageList)
    })
  })
}

const calcVersion = ({ version, bumpType, tag = '' }: { version: string; bumpType: string; tag?: string }) => {
  const { major, minor, patch } = semver.parse(version)
  let resultVersion = semver.inc(`${major}.${minor}.${patch}`, bumpType)

  if (tag === TAG.BETA) {
    resultVersion += `-beta.${Date.now()}`
  }

  return resultVersion
}

const npmLogin = async () => {
  await npmCliLogin(NPM_USER_NAME, NPM_USER_PASSWORD, NPM_USER_EMAIL, NPM_REGISTRY)
}

const getRealPublishDirname = ({ rootDirname, publishDirname, packageDirname }) => {
  if (!publishDirname) {
    return packageDirname
  }

  return path.join(rootDirname, publishDirname)
}

const npmPublish = async ({ dirname, tag = '' }) => {
  let sh = `cd ${dirname} && pnpm publish --registry ${NPM_REGISTRY} --no-git-checks`
  if (tag == 'beta') {
    sh += ` --tag=${tag}`
  }
  await execAsync(sh, [], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  })
}

const getTempDirname = () => {
  return `temp_${Math.random()}`
}

const getTempDirAbsolutePath = (tempDir) => {
  return path.join(__dirname, `../../../${tempDir}`)
}

const getFilename = (str) => {
  const list = str.split('/')
  return list[list.length - 1]
}

const uploadToOss = async ({ ossFilePath, version }: { ossFilePath: string; version: string }) => {
  const readable = await fs.createReadStream(ossFilePath)
  let filename = getFilename(ossFilePath)

  if (version) {
    const [name, ext] = filename.split('.')
    filename = `${name}-${version}.${ext}`
  }

  console.log(`upload lib/${filename}to oss`)
  return ''
  // TODO:
  // return await mockUpload(`lib/${filename}`, readable)
}

export {
  gitClone,
  gitCheckout,
  findPackage,
  calcVersion,
  npmLogin,
  npmPublish,
  getRealPublishDirname,
  getTempDirname,
  getTempDirAbsolutePath,
  getFilename,
  uploadToOss,
}
