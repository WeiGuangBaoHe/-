const promisesAplusTests = require("promises-aplus-tests")
const { reject } = require("underscore")

const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
/**
 * Promise构造函数
 * excutor: 内部同步执行的函数
 */
class PromiseA {
  constructor(excutor) {
    const self = this;
    self.status = PENDING;
    self.onFulfilled = [];// 成功的回调
    self.onRejected = [];// 失败的回调

    // 异步处理成功调用的函数
    // PromiseA+ 2.1 状态只能由Pending转为fulfilled或rejected；fulfilled状态必须有一个value值；rejected状态必须有一个reason值。
    function resolve(value) {
      if (self.status === PENDING) {
        self.status = FULFILLED;
        self.value = value;
        // PromiseA+ 2.2.6.1 相同promise的then可以被调用多次，当promise变为fulfilled状态，全部的onFulfilled回调按照原始调用then的顺序执行
        self.onFulfilled.forEach(fn => fn());
      }
    }

    function reject(reason) {
      if (self.status === PENDING) {
        self.status = REJECTED;
        self.reason = reason;
        // PromiseA+ 2.2.6.2 相同promise的then可以被调用多次，当promise变为rejected状态，全部的onRejected回调按照原始调用then的顺序执行
        self.onRejected.forEach(fn => fn());
      }
    }

    try {
      excutor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    // PromiseA+ 2.2.1 onFulfilled和onRejected是可选参数
    // PromiseA+ 2.2.5 onFulfilled和onRejected必须被作为函数调用
    // PromiseA+ 2.2.7.3 如果onFulfilled不是函数且promise1状态是fulfilled，则promise2有相同的值且也是fulfilled状态
    // PromiseA+ 2.2.7.4 如果onRejected不是函数且promise1状态是rejected，则promise2有相同的值且也是rejected状态
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

    const self = this;
    const promise = new Promise((resolve, reject) => {
      const handle = (callback, data) => {
        // PromiseA+ 2.2.4 onFulfilled或者onRejected需要在自己的执行上下文栈里被调用，所以此处用setTimeout
        setTimeout(() => {
          try {
            // PromiseA+ 2.2.2 如果onFulfilled是函数，则在fulfilled状态之后调用，第一个参数为value
            // PromiseA+ 2.2.3 如果onRejected是函数，则在rejected状态之后调用，第一个参数为reason
            const x = callback(data);
            // PromiseA+ 2.2.7.1 如果onFulfilled或onRejected返回一个x值，运行这[[Resolve]](promise2, x)
            resolvePromise(promise, x, resolve, reject);
          } catch (e) {
            // PromiseA+ 2.2.7.2 onFulfilled或onRejected抛出一个异常e，promise2必须以e的理由失败
            reject(e);
          }
        })
      }
      if (self.status === PENDING) {
        self.onFulfilled.push(() => {
          handle(onFulfilled, self.value);
        });

        self.onRejected.push(() => {
          handle(onRejected, self.reason);
        })
      } else if (self.status === FULFILLED) {
        setTimeout(() => {
          handle(onFulfilled, self.value);
        })
      } else if (self.status === REJECTED) {
        setTimeout(() => {
          handle(onRejected, self.reason);
        })
      }
    })

    return promise;
  }
}

function resolvePromise(promise, x, resolve, reject) {
  // PromiseA+ 2.3.1 如果promise和x引用同一对象，会以TypeError错误reject promise
  if (promise === x) {
    reject(new TypeError('Chaining Cycle'));
  }

  if (x && typeof x === 'object' || typeof x === 'function') {
    // PromiseA+ 2.3.3.3.3 如果resolvePromise和rejectPromise都被调用，或者对同一个参数进行多次调用，那么第一次调用优先，以后的调用都会被忽略。
    let used;
    try {
      // PromiseA+ 2.3.3.1 let then be x.then
      // PromiseA+ 2.3.2 调用then方法已经包含了该条（该条是x是promise的处理）。
      let then = x.then;

      if (typeof then === 'function') {
        // PromiseA+ 2.3.3.3如果then是一个函数，用x作为this调用它。第一个参数是resolvePromise，第二个参数是rejectPromise
        // PromiseA+ 2.3.3.3.1 如果resolvePromise用一个值y调用，运行[[Resolve]](promise, y)
        // PromiseA+ 2.3.3.3.2 如果rejectPromise用一个原因r调用，用r拒绝promise。
        then.call(x, (y) => {
          if (used) return;
          used = true;
          resolvePromise(promise, y, resolve, reject)
        }, (r) => {
          if (used) return;
          used = true;
          reject(r);
        })
      } else {
        // PromiseA+ 如果then不是一个函数，变为fulfilled状态并传值为x
        if (used) return;
        used = true;
        resolve(x);
      }
    } catch (e) {
      // PromiseA+ 2.3.3.2 如果检索属性x.then抛出异常e，则以e为原因拒绝promise
      // PromiseA+ 2.3.3.4 如果调用then抛出异常，但是resolvePromise或rejectPromise已经执行，则忽略它
      if (used) return;
      used = true;
      reject(e);
    }

  } else {
    // PromiseA+ 2.3.4 如果x不是一个对象或函数，状态变为fulfilled并传值x
    resolve(x);
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