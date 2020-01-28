const {spawn} = require('child_process')

const inferOwner = require('infer-owner')

// 'extra' object is for decorating the error a bit more
const promiseSpawn = (cmd, args, opts, extra = {}) => {
  const cwd = opts.cwd || process.cwd()
  const isRoot = process.getuid && process.getuid() === 0
  return !isRoot ? promiseSpawnUid(cmd, args, {
    ...opts,
    cwd,
    uid: undefined,
    gid: undefined,
  }, extra)
  : inferOwner(cwd).then(({uid, gid}) => promiseSpawnUid(cmd, args, {
    ...opts,
    cwd,
    uid,
    gid,
  }, extra))
}

const promiseSpawnUid = (cmd, args, opts, extra) =>
  new Promise((res, rej) => {
    const proc = spawn(cmd, args, opts)
    const stdout = []
    const stderr = []
    const reject = er => rej(Object.assign(er, {
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      ...extra,
    }))
    proc.on('error', reject)
    if (proc.stdout)
      proc.stdout.on('data', c => stdout.push(c)).on('error', reject)
    if (proc.stderr)
      proc.stderr.on('data', c => stderr.push(c)).on('error', reject)
    proc.on('close', (code, signal) => {
      const result = {
        code,
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        ...extra
      }
      if (code || signal)
        rej(Object.assign(new Error('command failed'), result))
      else
        res(result)
    })
  })

module.exports = promiseSpawn