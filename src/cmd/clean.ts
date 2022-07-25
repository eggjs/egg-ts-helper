import { cleanJs } from '../utils';
import chalk from 'chalk';

class CleanCommand implements SubCommand {
  description = 'Clean js file while it has the same name ts/tsx file';

  async run(_, { cwd }: SubCommandOption) {
    cleanJs(cwd);
    console.info(chalk.red('\nWARNING: `ets clean` has been deprecated! Use `tsc -b --clean` instead\n'));
  }
}

export default new CleanCommand();
