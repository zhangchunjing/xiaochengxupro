//logs.js
const config=require('../../config.js');
const {listToMatrix,always}=require('../../lib/util.js');
const request=require('../../lib/request.js');
const api=require('../../lib/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    //相册列表数据
    logsList:[],
    //图片布局列表（二维数组，由‘logsList’计算而成）
    layoutList:[],
    //布局列表
    layoutColumnSize:3,
    //是否显示loading
    showLoading:false,
    //loading提示语
    loadingMessage:'',
    //是否显示toast
    showToast:false,
    //提示消息
    toastMessage:'',
    //是否显示动作命令
    showActionSheet:false,
    //当前操作的图片
    imageInAction:'',
    //图片预览模式
    previewMode:false,
    //当前预览索引
    previewIndex:0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    this.renderLogsList();
    this.getLogsList().then((resp) => {
      if(resp.code!==0){
        //图片加载失败
        return;
      }
      this.setData({'logsList':this.data.logsList.concat(resp.data)});
      this.renderLogsList();
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    
  },

  //显示loading提示
  showLoading(loadingMessage){
    this.setData({showLoading:true,loadingMessage});
  },

  //隐藏loading提示
  hideLoading(){
    this.setData({showLoading:false,loadingMessage:''});
  },

  //显示toast提示
  showToast(toastMessage){
    this.setData({showToast:true,toastMessage});
  },

  //隐藏toast提示
  hideToast(){
    this.setData({showToast:false,toastMessage:''});
  },

  //隐藏动作列表
  hideActionSheet(){
    this.setData({showActionSheet:false,imageInAction:''});
  },

  //获取相册列表
  getLogsList(){
    this.showLoading('加载列表中...');
    setTimeout(() => this.hideLoading(),1000);
    return request({method:'Get',url:api.getUrl('/list')});
  },

  //渲染相册列表
  renderLogsList(){
    let layoutColumnSize=this.data.layoutColumnSize;
    let layoutList=[];
    if(this.data.logsList.length){
      layoutList=listToMatrix([0].concat(this.data.logsList),layoutColumnSize);
      let lastRow=layoutList[layoutList.length-1];
      if(lastRow.length<layoutColumnSize){
        let supplement=Array(layoutColumnSize-lastRow.length).fill(0);
        lastRow.push(...supplement);
      }
    }
    this.setData({layoutList});
  },

  //从相册选择照片或拍摄照片
  chooseImage(){
    wx.chooseImage({
      count: 9,
      sizeType: ['original','compressed'],
      sourceType: ['logs','camera'],
      success: function(res) {
        this.showLoading('正在上传图片...');
        console.log(api.getUrl('/upload'));
        wx.uploadFile({
          url: api.getUrl('/upload'),
          filePath: res.tempFilePaths[0],
          name: 'image',
          success:(res) =>{
            let response=JSON.parse(res.data);
            if(response.code===0){
              console.log(response);
              let logsList=this.data.logsList;
              logsList.unshift(response.data.imgUrl);
              this.setData({logsList});
              this.renderLogsList();
              this.showToast('图片上传成功');
            }else{
              console.log(response);
            }
          },
          fail: function (res) {
            console.log('fail',res);
           },
          complete: function (res) { 
            this.hideLoading();
          },
        });
      },
    });
  },

  //进入预览模式
  enterPreviewMode(event){
    if(this.data.showActionSheet){
      return;
    }
    let imageUrl=event.target.dataset.src;
    let previewIndex=this.data.logsList.indexOf(imageUrl);
    this.setData({previewMode:true,previewIndex:previewIndex});
  },

  //退出预览模式
  leavePreviewMode(){
    this.setData({previewMode:false,previewIndex:0});
  },

  //显示可操作命令
  showActions(event){
    this.setData({showActionSheet:true,imageInAction:event.target.dataset.src});
  },

  //下载图片
  downloadImage(){
    this.showLoading('正在保存图片...');
    console.log('download_image_url',this.data.imageInAction);
    wx.downloadFile({
      url: this.data.imageInAction,
      type:'image',
      success: function(resp) {
        wx.saveFile({
          tempFilePath: resp.tempFilePath,
          success: function(resp) {
            this.showToast('图片保存成功')
          },
          fail: function(resp) {
            console.log('fail',resp);
          },
          complete: function(resp) {
            console.log('complete',resp);
            this.hideLoading();
          },
        });
      },
      fail: function(resp) {
        console.log('fail',resp)
      },
    });
    this.setData({showActionSheet:false,imageInAction:''});
  },

  //删除图片
  deleteImage(){
    let imageUrl=this.data.imageInAction;
    let filepath='/'+imageUrl.split('/').slice(3).join('/');
    this.showLoading('正在删除图片...');
    this.setData({showActionSheet:false,imageInAction:''});
    request({
      method:'POST',
      url:api.getUrl('/delete'),
      data:{filepath},
    })
    .then((resp)=>{
      if(resp.code!==0){
        //图片删除失败
        return;
      }
      //从图片列表中移除
      let index=this.data.logsList.indexOf(imageUrl);
      if(~index){
        let logsList=this.data.logsList;
        logsList.splice(index,1);
        this.setData({logsList});
        this.renderLogsList();
      }
      this.showToast('图片删除成功');
    })
    .catch(error => {
      console.log('failed',error);
    })
    .then(() => {
      this.hideLoading();
    });
  },

});
