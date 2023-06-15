# Server request

All JSON requests server support.

- [Launch](#launch)

- [ methods](#methods)
    - [helpers](#helpers)

# Requests

<a name="launch"></a>
## InsertSript
```typescript
type InsertScriptRequest {
    type: string,
    user: string,
    password: string,
    description: string, # what would be shown in user description
    currentDir: string, # user + '/' + string
    title: string,
    source: string,
    pureJSCode: boolean # is code pureJS or should be compiled   
};


```
### Example
```typescript
{
    type: 'insertScript',
    user: 'user'
    password: 'user'
    description '',
    currentDir: 'user/
    title: 'mainScript'
    source: 'exports.start = () => {}'
    pureJSCode : true
};
```


