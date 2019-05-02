import CocosHelper from "./CocosHelper";
import BaseUIForm from "./BaseUIForm";
import { SysDefine, UIFormType, UIFormShowMode } from "./config/SysDefine";
import UILoader from "./UILoader";


const {ccclass, property} = cc._decorator;

@ccclass
export default class UIManager extends cc.Component {


    
    private _NoNormal: cc.Node = null;                              // 全屏显示的UI 挂载结点
    private _NoFixed: cc.Node = null;                               // 固定显示的UI
    private _NoPopUp: cc.Node = null;                               // 弹出窗口

    private _StaCurrentUIForms:Array<BaseUIForm> = [];                     // 存储反向切换的窗体
    private _MapFormsPaths: {[key: string]: string} = {};              // UI窗体预制体名称, 窗体预制体url
    private _MapAllUIForms: {[key: string]: BaseUIForm} = {};              // 所有的窗体
    private _MapCurrentShowUIForms: {[key: string]: BaseUIForm} = {};      // 正在显示的窗体

    private static _Instance: UIManager = null;

    onLoad () {
        this.InitRootCanvasLoading();
        this._NoNormal = CocosHelper.FindChildInNode(SysDefine.SYS_NORMAL_NODE, this.node);
        this._NoFixed = CocosHelper.FindChildInNode(SysDefine.SYS_FIXED_NODE, this.node);
        this._NoPopUp = CocosHelper.FindChildInNode(SysDefine.SYS_POPUP_NODE, this.node);
        cc.game.addPersistRootNode(this.node);
        this.InitUIFormsPathData();
    }

    static GetInstance(): UIManager {
        if(this._Instance == null) {
            this._Instance = cc.find(SysDefine.SYS_UIROOT_NAME).addComponent<UIManager>(this);
        }
        return this._Instance;
    }

    /**
     * 重要方法 加载显示一个UIForm
     * @param uiFormName 
     */
    public async ShowUIForms(uiFormName: string) {
        if(uiFormName == "" || uiFormName == null) return ;
        let baseUIForms = await this.LoadFormsToAllUIFormsCatch(uiFormName);
        
        if(baseUIForms == null) return ;

        if(baseUIForms.CurrentUIType.IsClearStack) {
            this.ClearStackArray();
        }

        switch(baseUIForms.CurrentUIType.UIForms_ShowMode) {
            case UIFormShowMode.Normal:                             // 普通模式显示
                this.LoadUIToCurrentCache(uiFormName);
            break;
            case UIFormShowMode.ReverseChange:                      // 反向切换
                this.PushUIFormToStack(uiFormName);
            break;
            case UIFormShowMode.HideOther:                          // 隐藏其他
                this.EnterUIFormsAndHideOther(uiFormName);
            break;
        }
    }
    /**
     * 重要方法 关闭一个UIForm
     * @param uiFormName 
     */
    public CloseUIForms(uiFormName: string) {
        if(uiFormName == "" || uiFormName == null) return ;
        let baseUIForm = this._MapAllUIForms[uiFormName];
        if(baseUIForm == null) return ;

        switch(baseUIForm.CurrentUIType.UIForms_ShowMode) {
            case UIFormShowMode.Normal:                             // 普通模式显示
                this.ExitUIForms(uiFormName);
            break;
            case UIFormShowMode.ReverseChange:                      // 反向切换
                this.PopUIForm();
            break;
            case UIFormShowMode.HideOther:                          // 隐藏其他
                this.ExitUIFormsAndDisplayOther(uiFormName);
            break;
        }

    }

    /**
     * 从全部的UI窗口中加载
     */
    private async LoadFormsToAllUIFormsCatch(uiFormName: string) {
        let baseUIResult = this._MapAllUIForms[uiFormName];
        if (baseUIResult == null) {
            //加载指定名称的“UI窗体”
            baseUIResult  = await this.LoadUIForm(uiFormName) as BaseUIForm;
        }
        return baseUIResult;
    }

    /**
     * 从resources中加载
     * @param uiFormName 
     */
    private async LoadUIForm(uiFormName: string) {
        let strUIFormPath = this._MapFormsPaths[uiFormName];
        if(strUIFormPath == "" || strUIFormPath == null){
            return ;
        }
        
        let pre = await UILoader.getInstance().loadRes(strUIFormPath, cc.Prefab) as cc.Prefab;
        let node: cc.Node = cc.instantiate(pre);
        let baseUIForm = node.getComponent(BaseUIForm);
        if(baseUIForm == null) {
            return ;
        }
        switch(baseUIForm.CurrentUIType.UIForms_Type) {
            case UIFormType.Normal:
                UIManager.GetInstance()._NoNormal.addChild(node);
            break;
            case UIFormType.Fixed:
                UIManager.GetInstance()._NoFixed.addChild(node);
            break;
            case UIFormType.PopUp:
                UIManager.GetInstance()._NoPopUp.addChild(node);
            break;
        }
        node.active = false;
        this._MapAllUIForms[uiFormName] = baseUIForm;
        
        return baseUIForm;
    }

        

    /**
     * 清除栈内所有窗口
     */
    private ClearStackArray() {
        if(this._StaCurrentUIForms != null && this._StaCurrentUIForms.length >= 1) {
            this._StaCurrentUIForms = [];
            return true;
        }
        return false;
    }

    /**
     * 加载到缓存中, 
     * @param uiFormName 
     */
    private LoadUIToCurrentCache(uiFormName: string) {
        let baseUIForm: BaseUIForm = null;
        let baseUIFormFromAllCache: BaseUIForm = null;

        baseUIForm = this._MapCurrentShowUIForms[uiFormName];
        if(baseUIForm != null) return ;                                     // 要加载的窗口正在显示

        baseUIFormFromAllCache = this._MapAllUIForms[uiFormName];
        if(baseUIFormFromAllCache != null) {
            this._MapCurrentShowUIForms[uiFormName] = baseUIFormFromAllCache;
            baseUIFormFromAllCache.DisPlay();
        }
    }
    /**
     * 加载到栈中
     * @param uiFormName 
     */
    private PushUIFormToStack(uiFormName: string) {
        if(this._StaCurrentUIForms.length > 0) {
            let topUIForm = this._StaCurrentUIForms.pop();
            topUIForm.Freeze();
        }
        let baseUIForm = this._MapAllUIForms[uiFormName];
        if(baseUIForm == null) return ;

        baseUIForm.DisPlay();
        this._StaCurrentUIForms.push(baseUIForm);
    }
    /**
     * 加载时, 关闭其他窗口
     */
    private EnterUIFormsAndHideOther(uiFormName: string) {
        if(uiFormName == "" || uiFormName == null) return ;

        let baseUIForm = this._MapCurrentShowUIForms[uiFormName];
        if(baseUIForm != null) return ;

        // 隐藏其他窗口 
        for(let key in this._MapCurrentShowUIForms) {
            this._MapCurrentShowUIForms[key].Hiding();
        }
        this._StaCurrentUIForms.forEach(uiForm => {
            uiForm.Hiding();
        });

        let baseUIFormFromAll = this._MapAllUIForms[uiFormName];
        
        if(baseUIFormFromAll == null) return ;

        this._MapCurrentShowUIForms[uiFormName] = baseUIFormFromAll;
        baseUIFormFromAll.DisPlay();
    }



    /**
     * --------------------------------- 关闭窗口 --------------------------
     */
    /**
     * 关闭一个UIForm
     * @param uiFormName 
     */
    private ExitUIForms(uiFormName: string) {
        if(uiFormName == "" || uiFormName == null) return ;
        let baseUIForm = this._MapAllUIForms[uiFormName];
        if(baseUIForm == null) return ;
        baseUIForm.Hiding();
        this._MapCurrentShowUIForms[uiFormName] = null;
        delete this._MapCurrentShowUIForms[uiFormName];
    }
    private PopUIForm() {
        if(this._StaCurrentUIForms.length >= 2) {
            let topUIForm = this._StaCurrentUIForms.pop();
            topUIForm.Hiding();
            topUIForm = this._StaCurrentUIForms.pop();
            topUIForm.ReDisPlay();
        }else if(this._StaCurrentUIForms.length >= 1) {
            let topUIForm = this._StaCurrentUIForms.pop();
            topUIForm.Hiding();
        }
    }
    private ExitUIFormsAndDisplayOther(uiFormName: string) {
        if(uiFormName == "" || uiFormName == null) return ;

        let baseUIForm = this._MapCurrentShowUIForms[uiFormName];
        if(baseUIForm == null) return ;
        baseUIForm.Hiding();
        this._MapCurrentShowUIForms[uiFormName] = null;
        delete this._MapCurrentShowUIForms[uiFormName];

        // 隐藏其他窗口 
        for(let key in this._MapCurrentShowUIForms) {
            this._MapCurrentShowUIForms[key].ReDisPlay();
        }
        this._StaCurrentUIForms.forEach(uiForm => {
            uiForm.ReDisPlay();
        });
    }


    /**
     * 预设场景
     */
    InitRootCanvasLoading() {

    }
    /**
     * 初始化预制体信息
     */
    InitUIFormsPathData() {
        this._MapFormsPaths = {
            "TestPanel": "TestPanel",
            "SelectPeople": "SelectPeople",
            "MainPanel": "MainPanel",
            "BottomPanel": "BottomPanel",
            "SkillPanel": "SkillPanel",
            "Maker_UIForm": "Maker_UIForm"
        }
    }


    
    

    // update (dt) {}
}