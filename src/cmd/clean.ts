import { cleanJs } from '../utils';

class CleanCommand implements SubCommand {
  description = 'Clean js file while it has the same name ts/tsx file';

  async run(_, { cwd }: SubCommandOption) {
    cleanJs(cwd);
  }
}

export default new CleanCommand();
