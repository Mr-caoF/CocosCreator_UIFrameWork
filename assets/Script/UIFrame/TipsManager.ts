import UIManager from "./UIManager";
import CocosHelper from "./CocosHelper";

const {ccclass, property} = cc._decorator;
/***
 * 独立窗体, 独立控制, 不受其他窗体控制
 * 
 * 这里专门用于处理  提示类窗体, 例如断线提示, 加载过场等
 */
@ccclass
export default class TipsManager{
    private static instance: TipsManager = null;                     // 单例
    static getInstance() {
        if(this.instance == null) {
            this.instance = new TipsManager();
        }
        return this.instance;
    }
    private loadingFormName: string;
    /** 设置加载页面 */
    public setLoadingForm(loadingName: string) {
        this.loadingFormName = loadingName;
    }
    public async showLoadingForm(path?: string) {
        if(path) {
            this.loadingFormName = path;
        }
        await UIManager.getInstance().openUIForm(this.loadingFormName);
    }
    /** 隐藏加载form */
    public async hideLoadingForm() {
        await UIManager.getInstance().closeUIForm(this.loadingFormName);
    }

    /** 提示窗体 */
    private tipsFormName: string;
    public setTipsForm(tipsFormName: string) {
        this.tipsFormName = tipsFormName;
    }
    public showStringTips() {
        
    }
    public showOfflineTips() {

    }
}
