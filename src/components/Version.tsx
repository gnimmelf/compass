import { Component } from "solid-js"


export const Version: Component<{
}> = (props) => {
    const version: string = __APP_VERSION__
    return (
        <small class="app-version">
            v{__APP_VERSION__}
        </small>
    )
}

