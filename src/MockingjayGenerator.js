class StubGenerator {
  constructor(request, httpExchange) {
    this.request = request
    this.httpExchange = httpExchange
    this.setupLines = []
  }

  generateStub() {
    const commentLine = `// Stub for "${this.request.name}"`
    const stubLine = `stub(${this._generateMatcher()}, ${this._generateBuilder()})`
    let lines = this.setupLines
    lines.unshift(commentLine)
    lines.push(stubLine)
    return lines.join('\n')
  }

  _getRequestSlug() {
    let slug = this.request.name.split(/[^a-z0-9]/i).map(s => s.substr(0,1).toUpperCase() + s.substr(1).toLowerCase()).join('')
    return slug.substr(0,1).toLowerCase() + slug.substr(1)
  }

  _generateMatcher() {
    const method = this.request.method.toUpperCase()
    if (method === 'GET') {
      return `uri("${this.request.urlBase}")`
    }
    else {
      return `http(.${method}, "${this.request.urlBase}")`
    }
  }

  _generateBuilder() {
    const contentType = this.httpExchange.responseHeaders['Content-Type']
    if (contentType.match(/^application\/json/)) {
      if (this.httpExchange.responseBody.length > 8192) {
        return this._generateLargeJsonBuilder()
      }
      return this._generateJsonBuilder()
    }
    return `http(${this.httpExchange.responseStatusCode})`
  }

  _generateLargeJsonBuilder() {
    const slug = this._getRequestSlug(this.request)
    const dataVarName = `${slug}JsonData`
    const objectVarName = `${slug}JsonObject`
    this.setupLines.push(`let ${dataVarName} = try! Data(contentsOf: Bundle.main.url(forResource: "${slug}", withExtension: "json")!)`)
    this.setupLines.push(`let ${objectVarName} = try! JSONSerialization.jsonObject(with: ${dataVarName}, options: [])`)
    return `json(${objectVarName}, status: ${this.httpExchange.responseStatusCode})`
  }

  _generateJsonBuilder() {
    let jsonObject
    let swiftJsonString
    try {
      jsonObject = JSON.parse(this.httpExchange.responseBody)
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
    return `json(${swiftJsonString}, status: ${this.httpExchange.responseStatusCode})`
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
}

@registerCodeGenerator
class MockingjayGenerator {
  static identifier = 'com.luckymarmot.PawExtensions.MockingjayGenerator';
  static title = 'Swift Mockingjay';

  _generateStub(request) {
    const lastExchange = request.getLastExchange()
    let generator = new StubGenerator(request, lastExchange)
    return generator.generateStub()
  }

  generate(context, requests, options) {
    return requests.map(request => {
      return this._generateStub(request)
    }).join('\n\n') + '\n'
  }
}
