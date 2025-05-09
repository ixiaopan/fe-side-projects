const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')

function kebabCase(key) {
  const result = key.replace(/([A-Z])/g, ' $1').trim()
  return result.split(' ').join('-').toLowerCase()
}
function cameCase(res) {
  return res.split('-').map(k => k[0].toUpperCase() + k.slice(1)).join('')
}
function firstCameCase(k) {
  return k[0].toLowerCase() + k.slice(1)
}
function createProject(name) {
  const distDir = path.join(process.cwd(), 'packages', name)

  console.log('project distDir', distDir);

  fs.copy(path.join(process.cwd(), 'template'), distDir).then(() => {
    console.log('done');
  }).catch((e) => console.error(e))
}

// entry point
const questions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'Pls input your project name',
    default: 'demo',
  }
]

inquirer
  .prompt(questions)
  .then((ans) => {
    const projectName = kebabCase(ans.projectName)
    createProject(projectName)
  })
  .catch(e => console.error(e))
