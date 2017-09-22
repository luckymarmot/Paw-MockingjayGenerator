@registerCodeGenerator
class MockingjayGenerator {
  static identifier = 'com.luckymarmot.PawExtensions.MockingjayGenerator';
  static title = 'Swift Mockingjay Generator';

  _generateStub(request) {
    const lastExchange = request.getLastExchange()
    return `stub(${this._generateMatcher(request)}, ${this._generateBuilder(lastExchange)})\n`
  }

  _generateMatcher(request) {
    const method = request.method.toUpperCase()
    if (method === 'GET') {
      return `uri("${request.urlBase}")`
    }
    else {
      return `http(.${method}, "${request.urlBase}")`
    }
  }

  _generateBuilder(httpExchange) {
    const contentType = httpExchange.responseHeaders['Content-Type']
    if (contentType.match(/^application\/json/)) {
      let jsonObject
      let swiftJsonString
      try {
        jsonObject = JSON.parse(httpExchange.responseBody)
      }
      catch (e) {
        console.error(`Invalid JSON response: ${e.toString()}`)
        jsonObject = null
      }
      if (jsonObject !== null) {
        swiftJsonString = this._generateJsonObject(jsonObject)
      }
      else {
        swiftJsonString = '/* JSON response */'
      }
      return `json(${swiftJsonString}, status: ${httpExchange.responseStatusCode})`
    }
    return `http(${httpExchange.responseStatusCode})`
  }

  _generateJsonObject(jsonObject, indent = 0) {
    if (jsonObject === null) {
      return 'NSNull.null()'
    }
    else if (typeof jsonObject === 'string') {
      return `"${jsonObject}"`
    }
    else if (Array.isArray(jsonObject)) {
      if (jsonObject.length === 0) {
        return '[]'
      }
      const children = jsonObject.map(obj => {
        return `${'  '.repeat(indent + 1)}${this._generateJsonObject(obj, indent + 1)}`
      })
      return `[\n${children.join(',\n')}\n${'  '.repeat(indent)}]`
    }
    else if (typeof jsonObject === 'object') {
      if (jsonObject.length === 0) {
        return '[:]'
      }
      const children = Object.keys(jsonObject).map(key => {
        return `${'  '.repeat(indent + 1)}"${key}": ${this._generateJsonObject(jsonObject[key], indent + 1)}`
      })
      return `[\n${children.join(',\n')}\n${'  '.repeat(indent)}]`
    }
    else {
      return jsonObject.toString()
    }
  }

  generate(context, requests, options) {
    return requests.map(request => {
      return this._generateStub(request)
    })
  }
}
