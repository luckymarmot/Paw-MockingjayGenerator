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
      return `uri("${request.url}")`
    }
    else {
      return `http(.${method}, "${request.url}")`
    }
  }

  _generateBuilder(httpExchange) {
    const contentType = httpExchange.responseHeaders['Content-Type']
    if (contentType.match(/^application\/json/)) {
      return `json(${this._generateJsonObject(JSON.parse(httpExchange.responseBody))}, status: ${httpExchange.responseStatusCode})`
    }
    return `http(${httpExchange.responseStatusCode})`
  }

  _generateJsonObject(jsonObject, indent = 0) {
    if (Array.isArray(jsonObject)) {
      const children = jsonObject.map(obj => {
        return `${'  '.repeat(indent + 1)}${this._generateJsonObject(obj, indent + 1)}`
      })
      return `[\n${children.join(',\n')}\n${'  '.repeat(indent)}]`
    }
    else if (typeof jsonObject === 'object') {
      const children = Object.keys(jsonObject).map(key => {
        return `${'  '.repeat(indent + 1)}"${key}": ${this._generateJsonObject(jsonObject[key], indent + 1)}`
      })
      return `[\n${children.join(',\n')}\n${'  '.repeat(indent)}]`
    }
    else if (typeof jsonObject === 'string') {
      return `"${jsonObject}"`
    }
    else {
      return jsonObject
    }
  }

  generate(context, requests, options) {
    return requests.map(request => {
      return this._generateStub(request)
    })
  }
}
