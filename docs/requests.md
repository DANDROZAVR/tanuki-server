# Server request

All JSON requests server support.

- [InsertScript](#CreateUser)
- [InsertScript](#InsertScript)
- [InsertScript](#UpdateScript)
- [InsertScript](#ExecScript)
- [InsertScript](#ScheduleScript)
- [InsertScript](#UpdateUserSettings)


# Requests

<a name="CreateUser"></a>
## CreateUser
```typescript
type InsertScriptRequest {
  type: string,
  user: string,
  password: string
};
```

## Example
```typescript
type InsertScriptRequest {
  type: 'createUser',
  user: 'user',
  password: 'user'
};
```




<a name="InsertScript"></a>
## InsertScript
```typescript
type InsertScriptRequest {
    type: string,
    user: string,
    password: string,
    description: string, # what would be shown in user description
    currentDir: string, # user + '/' + string
    title: string,
    source: string,
    pureJSCode?: boolean # is code pureJS or should be compiled   
};
```
## Example
```typescript
{
    type: 'insertScript',
    user: 'user'
    password: 'user'
    description '',
    currentDir: 'user/
    title: 'mainScript'
    source: 'exports.start = () => {}'
    pureJSCode?: true
};
```





<a name="UpdateScript"></a>
## UpdateScript
```typescript
type InsertScriptRequest {
    type: string,
    user: string,
    password: string,
    description: string, # what would be shown in user description
    currentDir: string, # user + '/' + string
    title: string,
    source: string,
    pureJSCode?: boolean # is code pureJS or should be compiled   
};
```

## Example
```typescript
{
    type: 'updateScript',
    user: 'user'
    password: 'user'
    description '',
    currentDir: 'user/
    title: 'mainScript'
    source: 'load('https://developers.google.com/web/')' # new source code
    pureJSCode?: false
};
```




<a name="ExecScript"></a>
## ExecScript
```typescript
{
  type: string,
  user: string,
  password: string,
  title: string,
  path: string,
}
```
## Example
```typescript
{
  type: 'execScript',
  user: 'user',
  password: 'user',
  title: 'notion',
  path: 'user/notion',
}
```



<a name="ScheduleScript"></a>
## ScheduleScript
```typescript
{
  type: 'scheduleScript',
  user: 'crypto',
  password: 'seedpassword',  
  title: 'notion',
  path: 'user/notion',
  scheduleOptions: {
    tag: 'times',
    times?: {
      timesExecution number:
      minWaitMinute: number, # min minutes waiting before next time script will be executed
      maxWaitMinute: number, # max minutes
    },
    once?: {
      date: Date
    }
    # either "once" or "times" tag should be defined
    scriptOptions?: JSON,
  }
}
```

## Example
```typescript
{
  type: 'scheduleScript',
  user: 'crypto',
  password: 'seedpassword',  
  title: 'notion',
  path: 'user/notion',
  scheduleOptions: {
    tag: 'times' | 'once',
    times?: {
      timesExecution: 3,
      minWaitMinute: 1, # min 1 minutes waiting before next time script will be executed
      maxWaitMinute: 5, # max 5 minutes
    },
    scriptOptions?: {
		  member: 'value' # script will have access to this
    }
  }
}
```

<a name="UpdateUserSettings"></a>
## UpdateUserSettings
```typescript
{
  type: 'updateUserSettings',
  user: 'crypto',
  password: 'seedpassword',
  retryScriptOnFailDefault: 3,
  maxScriptsRunningSameTime: 1
}
```

## Example
```typescript
{
    type: 'updateUserSettings',
        user: 'user',
        password: 'user',
        retryScriptOnFailDefault: 3,  # how many times script will be re-executed on error
    maxScriptsRunningSameTime: 1  # max number of scripts running simmultiniously
}
```