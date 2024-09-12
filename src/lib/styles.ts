import jss, { SheetsRegistry } from 'jss'
import preset from 'jss-preset-default'
import jssPluginSyntaxExtend from 'jss-plugin-extend'
import jssPluginSyntaxGlobal from 'jss-plugin-global'
import jssPluginSyntaxNested from 'jss-plugin-nested'

jss.setup(preset())
jss.use(
    jssPluginSyntaxExtend(),
    jssPluginSyntaxGlobal(),
    jssPluginSyntaxNested()
)

export const stylesRegistry = new SheetsRegistry()

export const createSheet = (rules: any) => {
    const sheet = jss.createStyleSheet(rules, { media: 'screen' }).attach()
    stylesRegistry.add(sheet)

    return sheet
}


