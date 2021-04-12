const promisesAplusTests = require("promises-aplus-tests")
const { reject } = require("underscore")


const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class PromiseA {
  constructor(exector) {
    this.value = null
    this.reason = null
    this.status = PENDING
    this.onResolvedCallbacks = []
    this.onRejectedCallbacks = []

    try {
      exector(this.resolve, this.reject)
    } catch(e) {
      this.reject(e)
    }
  }

  resolve(value) {
    if (this.status === PENDING) {
      this.status = FULFILLED
      this.value = value
      this.onResolvedCallbacks.forEach(callback => callback(this.value))
    }
  }

  reject(reason) {
    if (this.status === PENDING) {
      this.status = REJECTED
      this.reason = reason
      this.onRejectedCallbacks.forEach(callback => callback(reason))
    }
  }

  then(onResolved, onRejected) {
    onResolved = typeof onResolved === 'function' ? onResolved : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => reason
    const promise = new PromiseA((resolve, reject) => {
      const onResolvedCallback = value => {
        try {
          let x = onResolved(value)
          resolvePromise(promise, x, resolve, reject)
        } catch(e) {
          reject(e)
        }
      }
      const onRejectedCallback = reason => {
        try {
          let x = onRejected(reason)
          resolvePromise(promise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }
      if (this.status === PENDING) {
        this.onResolvedCallbacks.push(() => setTimeout(onResolvedCallback, 0))
        this.onRejectedCallbacks.push(() => setTimeout(onRejectedCallback, 0))
      } else if (this.status === FULFILLED) {
        setTimeout(onResolvedCallback, 0)
      } else {
        setTimeout(onRejectedCallback, 0)
      }
    })
    return promise
  }
}

const isObject = value => value !== null && typeof value === 'object'

function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    reject(new TypeError(`循环promise`))
  }
  if (x instanceof PromiseA) {
    x.then(value => resolve(value), reason => reject(reason))
  } else if (isObject(x) || typeof x === 'function') {
    let used = false
    try {
      let then = x.then
      if (typeof then === 'function') {
        then.call(x, y => {
          if (!used) {
            used = true
            resolvePromise(promise, y, resolve, reject)
          }
        }, r => {
          if (!used) {
            used = true
            reject(r)
          }
        })
      } else {
        resolve(x)
      }
    } catch(e) {
      if (!used) {
        reject(e)
      }
    }
  } else {
    resolve(x)
  }
}

const aaa = {
  resolved: (value) => new PromiseA((resolve, reject) => resolve(value)),
  rejected: (reason) => new PromiseA((resolved, reject) => reject(reason)),
  deferred: () => {
    let resolve
    let reject
    let promise = new PromiseA((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    return {
      resolve,
      reject,
      promise
    }
  }
}

promisesAplusTests(aaa, err => console.log(err))

// let pros = new Promise((resolve, reject) => {
//   setTimeout(() => resolve({a: 1, b: 2}), 1000)
// })

// pros.then(value => {
//   console.log('1 then:')
//   console.log(value)
//   value.a = 11
// })
// pros.then(value => {
//   console.log('2 then:')
//   console.log(value)
//   value.a = 111
// })