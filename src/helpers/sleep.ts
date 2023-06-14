export const sleep = async (time:number) => {
    await new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}